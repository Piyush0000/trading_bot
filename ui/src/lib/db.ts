import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

type GlobalWithMongoose = typeof globalThis & {
  _mongooseConn?: typeof mongoose;
};

const globalWithMongoose = global as GlobalWithMongoose;

export const getDb = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI env is required");
  }
  if (globalWithMongoose._mongooseConn && mongoose.connection.readyState === 1) {
    return globalWithMongoose._mongooseConn;
  }

  await mongoose.connect(MONGO_URI, { dbName: "tradingbot" });
  globalWithMongoose._mongooseConn = mongoose;
  return mongoose;
};
