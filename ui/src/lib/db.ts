import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_URI ??
  "mongodb+srv://piyushrathore:piyushcodes@cluster0.wiqfcjk.mongodb.net/tradingbot?retryWrites=true&w=majority&appName=Cluster0";

if (!MONGO_URI) {
  throw new Error("MONGO_URI env is required");
}

type GlobalWithMongoose = typeof globalThis & {
  _mongooseConn?: typeof mongoose;
};

const globalWithMongoose = global as GlobalWithMongoose;

export const getDb = async () => {
  if (globalWithMongoose._mongooseConn && mongoose.connection.readyState === 1) {
    return globalWithMongoose._mongooseConn;
  }

  await mongoose.connect(MONGO_URI, { dbName: "tradingbot" });
  globalWithMongoose._mongooseConn = mongoose;
  return mongoose;
};
