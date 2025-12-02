import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
// import "express-async-errors";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// API routes
app.use("/api", routes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
