import { Router } from "express";
import userRoutes from "./users";
import letterRoutes from "./letters";
import draftRoutes from "./drafts";
import ogRoutes from "./og";
import testRoutes from "./tests";
import addressRoutes from "./addressRoutes";
import adminRoutes from "./adminRoutes";
import adRoutes from "./adRoutes";
import noticeRoutes from "./notices";
import inquiryRoutes from "./inquiries";

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

// Test routes (MVC 패턴 예제)
router.use("/tests", testRoutes);

// Address routes (배송지 관리)
router.use("/addresses", addressRoutes);

// Admin routes (관리자)
router.use("/admin", adminRoutes);

// Ad routes (광고)
router.use("/ads", adRoutes);

// 공지 (공개)
router.use("/notices", noticeRoutes);

// 1:1 문의 (로그인)
router.use("/inquiries", inquiryRoutes);


// Fallback for undefined routes
router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: "Route not found" },
  });
});

export default router;
