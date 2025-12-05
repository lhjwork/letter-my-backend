import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

const router: Router = Router();

/**
 * Development-only token issuer
 * POST /api/dev/token
 * Body: { id?: string, email?: string }
 * Returns: { success: true, token }
 *
 * NOTE: This route is intended for local development/testing only.
 */
router.post("/token", (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ success: false, message: "Not allowed in production" });
    return;
  }

  const { userId = "dev-user-id", email = "dev@example.com" } = req.body ?? {};

  // Keep payload compatible with verifyToken expectations (userId, email)
  const payload = {
    userId,
    email,
  };

  const secret = process.env.JWT_SECRET || "dev-secret";
  const token = jwt.sign(payload, secret, { expiresIn: "7d" });

  res.json({ success: true, token });
});

export default router;
