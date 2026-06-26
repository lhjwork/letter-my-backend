import mongoose from "mongoose";

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

export const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  const options = {
    autoIndex: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(mongoUri, options);
      console.log("✅ MongoDB connected successfully");
      break;
    } catch (error) {
      retries++;
      if (retries >= MAX_RETRIES) {
        console.error(`❌ MongoDB connection failed after ${MAX_RETRIES} attempts:`, error);
        process.exit(1);
      }
      console.warn(`⚠️ MongoDB connection attempt ${retries}/${MAX_RETRIES} failed. Retrying in ${RETRY_INTERVAL_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
    }
  }

  // Connection event handlers
  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected. Mongoose will attempt to reconnect automatically.");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("✅ MongoDB reconnected");
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("MongoDB connection closed through app termination");
    process.exit(0);
  });
};
