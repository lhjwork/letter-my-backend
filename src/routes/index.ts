import { Router } from "express";
import userRoutes from "./users";
import testRoutes from "./tests";
import devAuthRoutes from "./devAuth";

const router: Router = Router();

// Health check route
router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// User routes
router.use("/users", userRoutes);

// Dev-only auth helper (token issuance for Postman/local testing)
router.use("/dev", devAuthRoutes);

// Test routes (MVC 패턴 예제)
router.use("/tests", testRoutes);

// Fallback for undefined routes
router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: "Route not found" },
  });
});

export default router;
