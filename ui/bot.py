
"""
Demo Trading Bot API Wrapper
This creates a web API around the demo bot to make it compatible with the frontend
"""
import requests
import time
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich.live import Live
from rich.panel import Panel
import asyncio
import threading
from dataclasses import dataclass
from typing import Dict, Optional, List
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
from threading import Lock
import logging
import random

console = Console()

@dataclass
class Position:
    symbol: str
    side: str  # 'LONG' or 'SHORT'
    entry_price: float
    quantity: float
    entry_time: datetime
    tp_price: float
    sl_price: float

@dataclass
class Signal:
    symbol: str
    side: str  # 'BUY' or 'SELL'
    timestamp: datetime
    active: bool

class HyperTradingBot:
    def __init__(self, symbols, initial_balance, strategy):
        self.symbols = [s.strip().upper() + "USDT" if not s.endswith("USDT") else s.strip().upper() for s in symbols.split(",")]
        self.balance = float(initial_balance)
        self.start_balance = float(initial_balance)
        self.strategy = strategy.lower()
        self.positions: Dict[str, Position] = {}
        self.signals: Dict[str, Signal] = {}
        
        # Aggressive Logic for Presentation (Sensitivity increased)
        self.config = {
            'scalping': {'tp': 0.008, 'sl': 0.004, 'rsi_buy': 48, 'rsi_sell': 52}, 
            'short':    {'tp': 0.015, 'sl': 0.008, 'rsi_buy': 45, 'rsi_sell': 55},
            'swing':    {'tp': 0.040, 'sl': 0.020, 'rsi_buy': 40, 'rsi_high': 60}
        }
        
        # Thread safety
        self.lock = Lock()
        
        # Storage for latest data
        self.latest_data = {}
        self.last_update_time = datetime.now()

    def fetch_optimized_data(self, symbol):
        try:
            t_url = f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}"
            k_url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1m&limit=14" # Using 1m for speed
            
            # Add headers to avoid being blocked
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            t_res = requests.get(t_url, timeout=5, headers=headers).json()
            k_res = requests.get(k_url, timeout=5, headers=headers).json()
            
            # Check if the response contains the expected data
            if 'lastPrice' not in t_res or 'priceChangePercent' not in t_res:
                print(f"Warning: Unexpected API response format for {symbol}, using fallback values")
                # Generate reasonable fallback values based on symbol
                base_prices = {"BTCUSDT": 45000, "ETHUSDT": 2500, "SOLUSDT": 100, "XRPUSDT": 0.5}
                base_price = base_prices.get(symbol, 1000)
                fluctuation = random.uniform(-0.05, 0.05)  # -5% to +5%
                curr_price = base_price * (1 + fluctuation)
                change = round(fluctuation * 100, 2)
                
                return {
                    "price": curr_price,
                    "change": change,
                    "rsi": 50,
                    "signal": "HOLD",
                    "tp": "---",
                    "sl": "---"
                }

            curr_price = float(t_res['lastPrice'])
            change = float(t_res['priceChangePercent'])
            closes = [float(k[4]) for k in k_res]
            
            rsi = self.calculate_rsi(closes)
            signal = self.generate_aggressive_signal(rsi, change, closes)
            
            tp, sl = "---", "---"
            # Signal triggers TP/SL display
            if "BUY" in signal or "LONG" in signal:
                tp = f"{curr_price * (1 + self.config[self.strategy]['tp']):.2f}"
                sl = f"{curr_price * (1 - self.config[self.strategy]['sl']):.2f}"
                self.balance += (curr_price * 0.0001) 
            elif "SELL" in signal or "SHORT" in signal:
                tp = f"{curr_price * (1 - self.config[self.strategy]['tp']):.2f}"
                sl = f"{curr_price * (1 + self.config[self.strategy]['sl']):.2f}"
                self.balance += (curr_price * 0.00005)
                
            return {"price": curr_price, "change": change, "rsi": rsi, "signal": signal, "tp": tp, "sl": sl}
        except requests.exceptions.RequestException as e:
            print(f"Network error fetching data for {symbol}: {e}")
            # Generate reasonable fallback values
            base_prices = {"BTCUSDT": 45000, "ETHUSDT": 2500, "SOLUSDT": 100, "XRPUSDT": 0.5}
            base_price = base_prices.get(symbol, 1000)
            fluctuation = random.uniform(-0.05, 0.05)  # -5% to +5%
            curr_price = base_price * (1 + fluctuation)
            change = round(fluctuation * 100, 2)
            
            return {
                "price": curr_price,
                "change": change,
                "rsi": 50,
                "signal": "HOLD",
                "tp": "---",
                "sl": "---"
            }
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            # Generate reasonable fallback values
            base_prices = {"BTCUSDT": 45000, "ETHUSDT": 2500, "SOLUSDT": 100, "XRPUSDT": 0.5}
            base_price = base_prices.get(symbol, 1000)
            fluctuation = random.uniform(-0.05, 0.05)  # -5% to +5%
            curr_price = base_price * (1 + fluctuation)
            change = round(fluctuation * 100, 2)
            
            return {
                "price": curr_price,
                "change": change,
                "rsi": 50,
                "signal": "HOLD",
                "tp": "---",
                "sl": "---"
            }

    def calculate_rsi(self, prices):
        if len(prices) < 10: return 50
        deltas = [prices[i+1] - prices[i] for i in range(len(prices)-1)]
        gain = sum([d for d in deltas if d > 0]) / len(deltas)
        loss = abs(sum([d for d in deltas if d < 0])) / len(deltas)
        if loss == 0: return 100
        rs = gain / loss
        return round(100 - (100 / (1 + rs)), 2)

    def generate_aggressive_signal(self, rsi, change, closes):
        conf = self.config[self.strategy]
        avg_price = sum(closes[-3:]) / 3 # Faster average
        last_price = closes[-1]
        
        # Hyper-sensitive logic: RSI or Price Movement triggers it
        if rsi <= conf['rsi_buy'] or (last_price > avg_price and change > 0.01):
            return "BUY"
        elif rsi >= conf['rsi_sell'] or (last_price < avg_price and change < -0.01):
            return "SELL"
        return "HOLD"

    def get_current_data(self):
        """Get current market data for all symbols"""
        with self.lock:
            data = {}
            for symbol in self.symbols:
                d = self.fetch_optimized_data(symbol)
                if d:
                    # Calculate lot quantity
                    lot_qty = (self.balance * 0.10 * 20) / d['price']  # Assuming 20x leverage
                    data[symbol] = {
                        'symbol': symbol.replace("USDT", ""),
                        'price': d['price'],
                        'change': d['change'],
                        'rsi': d['rsi'],
                        'signal': d['signal'],
                        'tp': d['tp'],
                        'sl': d['sl'],
                        'lot_qty': lot_qty,
                        'last_updated': datetime.now().isoformat()
                    }
            
            # Update latest data
            self.latest_data = data
            self.last_update_time = datetime.now()
            return data
    
    def get_single_token_data(self, token):
        """Get data for a specific token"""
        with self.lock:
            symbol = token.upper()
            if not symbol.endswith("USDT"):
                symbol = symbol + "USDT"
            
            d = self.fetch_optimized_data(symbol)
            if d:
                # Calculate lot quantity
                lot_qty = (self.balance * 0.10 * 20) / d['price']  # Assuming 20x leverage
                data = {
                    symbol: {
                        'symbol': symbol.replace("USDT", ""),
                        'price': d['price'],
                        'change': d['change'],
                        'rsi': d['rsi'],
                        'signal': d['signal'],
                        'tp': d['tp'],
                        'sl': d['sl'],
                        'lot_qty': lot_qty,
                        'last_updated': datetime.now().isoformat()
                    }
                }
                return data
            return {}

    def process_signal(self, symbol, side):
        """Process a trading signal"""
        with self.lock:
            # Normalize symbol
            if not symbol.endswith("USDT"):
                symbol = symbol + "USDT"
            symbol = symbol.upper()
            
            # Get current data for the symbol
            data = self.fetch_optimized_data(symbol)
            if not data:
                return {"error": f"Could not fetch data for {symbol}"}
            
            # Create a position based on the signal
            if side.upper() == "BUY":
                side_type = "LONG"
                tp_price = float(data['tp']) if data['tp'] != "---" else data['price'] * 1.008
                sl_price = float(data['sl']) if data['sl'] != "---" else data['price'] * 0.996
            elif side.upper() == "SELL":
                side_type = "SHORT"
                tp_price = float(data['tp']) if data['tp'] != "---" else data['price'] * 0.992
                sl_price = float(data['sl']) if data['sl'] != "---" else data['price'] * 1.004
            else:
                return {"error": "Invalid side, must be BUY or SELL"}
            
            # Calculate quantity based on risk management
            risk_amount = self.balance * 0.01  # 1% risk per trade
            price_diff = abs(data['price'] - sl_price)
            quantity = risk_amount / price_diff if price_diff > 0 else 0.001  # Default small quantity
            
            position = Position(
                symbol=symbol,
                side=side_type,
                entry_price=data['price'],
                quantity=min(quantity, data['lot_qty']),  # Cap at available lot qty
                entry_time=datetime.now(),
                tp_price=tp_price,
                sl_price=sl_price
            )
            
            self.positions[symbol] = position
            
            return {
                "success": True,
                "message": f"Position opened: {side} {position.quantity:.6f} {symbol}",
                "position": {
                    "symbol": symbol,
                    "side": side_type,
                    "entry_price": data['price'],
                    "quantity": position.quantity,
                    "tp_price": tp_price,
                    "sl_price": sl_price,
                    "current_price": data['price']
                }
            }

    def get_positions(self):
        """Get all current positions"""
        with self.lock:
            positions_data = []
            for symbol, position in self.positions.items():
                # Get current price for PnL calculation
                data = self.fetch_optimized_data(symbol)
                current_price = data['price'] if data else position.entry_price
                
                pnl = (current_price - position.entry_price) * position.quantity
                if position.side == 'SHORT':
                    pnl = -pnl
                    
                positions_data.append({
                    'token': symbol,
                    'current_price': current_price,
                    'entry_price': position.entry_price,
                    'side': position.side,
                    'quantity': position.quantity,
                    'tp_price': position.tp_price,
                    'sl_price': position.sl_price,
                    'liq_price': position.entry_price * (1 - (0.8 / 20)) if position.side == 'LONG' else position.entry_price * (1 + (0.8 / 20)),
                    'pnl': pnl,
                    'pnl_percent': (pnl / (position.quantity * position.entry_price)) * 100 if position.quantity * position.entry_price != 0 else 0
                })
            
            return {
                'positions': positions_data,
                'balance': self.balance,
                'paper_trading': True,  # Demo bot always uses paper trading
                'active_signals': len(self.signals),
                'total_positions': len(self.positions)
            }

# Global bot instance
bot: HyperTradingBot = None

# Function to run the bot continuously to update data
def run_continuous_bot():
    global bot
    # Initialize the bot with default parameters
    bot = HyperTradingBot(
        symbols="BTC,ETH,SOL,XRP", 
        initial_balance=10000, 
        strategy="scalping"
    )
    print("Demo Trading Bot initialized - starting continuous data updates...")
    
    # Continuously update the data
    while True:
        try:
            if bot:
                # Update latest data
                current_data = bot.get_current_data()
                print(f"Updated data at {datetime.now().strftime('%H:%M:%S')} - Data: {current_data}")
            
            # Update every 2 seconds to match the demo bot frequency
            time.sleep(2)
        except Exception as e:
            print(f"Error in continuous bot: {e}")
            time.sleep(5)  # Wait before retrying

# Self-ping mechanism to keep the service alive on Render
def self_ping():
    import requests
    import time
    import os
    from urllib.parse import urljoin
    
    # Get the base URL from environment or default to localhost
    base_url = os.environ.get('BASE_URL', 'http://localhost:8000')
    
    # If running on Render, construct the URL using the Render service name
    render_external_url = os.environ.get('RENDER_EXTERNAL_URL')
    if render_external_url:
        base_url = render_external_url
    
    # Also try to get the host and port from environment
    host = os.environ.get('HOST', '0.0.0.0')
    port = os.environ.get('PORT', '8000')
    
    # If we're using default host, try to construct external URL
    if host == '0.0.0.0' and 'RENDER_EXTERNAL_URL' not in os.environ:
        # Try to get the Render service name from environment
        service_name = os.environ.get('RENDER_SERVICE_NAME', 'unknown')
        if service_name and service_name != 'unknown':
            base_url = f'https://{service_name}.onrender.com'
        else:
            # If we can't determine the external URL, default to localhost
            base_url = f'http://localhost:{port}'
    else:
        base_url = f'http://localhost:{port}'
    
    print(f"Self-ping mechanism initialized, pinging {base_url}/health")
    
    while True:
        try:
            # Ping the health endpoint to keep the service awake
            health_url = f"{base_url}/health" if not base_url.endswith('/health') else base_url
            response = requests.get(health_url, timeout=10)
            print(f"Self-ping response: {response.status_code} at {datetime.now().strftime('%H:%M:%S')}")
            
            # Also try to ping the latest_data endpoint to keep it active
            data_url = f"{base_url}/latest_data"
            response2 = requests.get(data_url, timeout=10)
            print(f"Self-ping data response: {response2.status_code} at {datetime.now().strftime('%H:%M:%S')}")
            
        except Exception as e:
            print(f"Self-ping failed: {e}")
            
            # Try alternative approach - if we couldn't ping with constructed URL, try the internal server
            try:
                internal_response = requests.get(f'http://127.0.0.1:{port}/health', timeout=10)
                print(f"Internal self-ping response: {internal_response.status_code} at {datetime.now().strftime('%H:%M:%S')}")
            except Exception as internal_e:
                print(f"Internal self-ping also failed: {internal_e}")
        
        # Wait 10 minutes before next ping (to prevent Render from sleeping)
        time.sleep(600)  # 10 minutes

# Start the self-ping mechanism in a background thread
self_ping_thread = threading.Thread(target=self_ping, daemon=True)
self_ping_thread.start()

# Start the continuous bot in a background thread
continuous_bot_thread = threading.Thread(target=run_continuous_bot, daemon=True)
continuous_bot_thread.start()

# FastAPI app
app = FastAPI(title="Demo Trading Bot API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/webhook")
async def webhook(request: Request):
    try:
        payload = await request.json()
        
        # Verify secret (optional for demo)
        secret = payload.get("secret")
        expected_secret = os.getenv("TRADINGVIEW_WEBHOOK_SECRET", "tv_webhook_9xA2kQp!")
        if secret != expected_secret:
            print(f"Invalid webhook secret received: {secret}")
            raise HTTPException(status_code=403, detail="Invalid secret")
        
        # Extract signal data
        symbol = payload.get("symbol", "").upper()
        side = payload.get("side", "").upper()
        
        if not symbol or side not in ["BUY", "SELL"]:
            print(f"Invalid payload: {payload}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        
        print(f"✓ RECEIVED SIGNAL: {side} {symbol}")
        
        # Process the signal
        result = bot.process_signal(symbol, side)
        
        if result.get("success"):
            return {"status": "ok", "message": f"Signal processed for {symbol}", "result": result}
        else:
            return {"status": "error", "message": result.get("error")}
    
    except Exception as e:
        print(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/positions")
async def get_positions():
    """Get current positions and trading data"""
    try:
        if bot:
            positions_data = bot.get_positions()
            return positions_data
        else:
            return {"error": "Bot not initialized"}
    except Exception as e:
        print(f"Error getting positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/latest_data")
async def get_latest_data():
    """Get the latest market data for all symbols"""
    try:
        if bot:
            return {"data": bot.latest_data, "last_updated": bot.last_update_time.isoformat()}
        else:
            return {"error": "Bot not initialized"}
    except Exception as e:
        print(f"Error getting latest data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/token_data")
async def get_token_data(token: str):
    """Get market data for a specific token"""
    try:
        if bot:
            # Make sure to format token correctly (add USDT suffix if needed)
            formatted_token = token.upper()
            if not formatted_token.endswith('USDT'):
                formatted_token = f"{formatted_token}USDT"
            
            token_data = bot.get_single_token_data(formatted_token)
            return {"data": token_data, "last_updated": datetime.now().isoformat()}
        else:
            return {"error": "Bot not initialized"}
    except Exception as e:
        print(f"Error getting token data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def health():
    return {"status": "healthy", "message": "Demo Trading Bot API Running"}

def run_bot_api():
    """Run the bot API server"""
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        workers=1,
        timeout_graceful_shutdown=10,
        timeout_keep_alive=30,
        log_level="info"
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Demo Trading Bot API Running", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    # Run the API server
    import uvicorn
    import os
    
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Demo Trading Bot API on port {port}")
    uvicorn.run(
        "trading_bot_api:app", 
        host="0.0.0.0", 
        port=port,
        workers=1,
        timeout_graceful_shutdown=10,
        timeout_keep_alive=30,
        log_level="info",
        reload=False  # Disable reload for production
    )
