import { Router } from "express";
import userRoutes from "./users";
import letterRoutes from "./letters";
import draftRoutes from "./drafts";
import ogRoutes from "./og";
import testRoutes from "./tests";
import devAuthRoutes from "./devAuth";
import addressRoutes from "./addressRoutes";
import adminRoutes from "./adminRoutes";

const router: Router = Router();

// Health check route
router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});
//
// User routes
router.use("/users", userRoutes);

// Letter routes
router.use("/letters", letterRoutes);

// Draft routes (임시저장)
router.use("/drafts", draftRoutes);

// OG Image routes
router.use("/og", ogRoutes);

// Dev-only auth helper (token issuance for Postman/local testing)
router.use("/dev", devAuthRoutes);

// Test routes (MVC 패턴 예제)
router.use("/tests", testRoutes);

// Address routes (배송지 관리)
router.use("/addresses", addressRoutes);

// Admin routes (관리자)
router.use("/admin", adminRoutes);

// Fallback for undefined routes
router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: "Route not found" },
  });
});

export default router;
