import { Router } from "express";
import userRoutes from "./users";

const router: Router = Router();

// Health check route
router.get("/test", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// User routes -> 요청 분배
router.use("/users", userRoutes);

// Fallback for undefined routes
router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: "Route not found" },
  });
});

export default router;
