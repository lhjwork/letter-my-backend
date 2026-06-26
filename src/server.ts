import dotenv from "dotenv";
import app from "./app";
import { connectDatabase } from "./config/database";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      console.log(`🚀 API available at http://localhost:${PORT}/`);
    });

    // 요청 타임아웃 설정 (30초)
    server.timeout = 30000;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

startServer();
