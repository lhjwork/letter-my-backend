import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import swaggerUi from "swagger-ui-express";
import path from "path";
import crypto from "crypto";
import { specs } from "./config/swagger";
// import "express-async-errors";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { setupDraftCleanupJob } from "./jobs/cleanupDrafts";

// 하드코딩 폴백 대신 부팅마다 랜덤 (MemoryStore 라 재시작 시 세션이 어차피 사라짐). SESSION_SECRET 설정 권장.
const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET) console.warn("[SECURITY] SESSION_SECRET 미설정");

const app: Application = express();

// nginx 1홉 뒤. true 금지 (X-Forwarded-For 위조로 rate limit 우회)
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  // 개발 환경
  "http://localhost:3001", // 메인 프론트엔드
  "http://localhost:3000", // 메인 프론트엔드
  "http://localhost:5173", // Admin 프론트엔드 (Vite)
  "http://localhost:5175", // Admin 프론트엔드 (Vite 대체 포트)

  // 프로덕션 환경
  "https://letter-community.vercel.app", // 메인 임시 프론트엔드 프로덕션 도메인
  "https://letter-admin.vercel.app", // 메인 임시 admin 도메인
];

app.use(
  cors({
    origin: (origin, callback) => {
      // 개발 환경에서 origin이 없는 경우 (Postman, 모바일 앱 등) 허용
      if (!origin) {
        callback(null, true);
        return;
      }

      // 허용된 origin인지 확인
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session configuration for author approval system
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Static files (OG 이미지 서빙)
app.use("/og-custom", express.static(path.join(process.cwd(), "public", "og-custom")));

// Root route - 서버 실행 확인
app.get("/", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>서버 실행 중</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          text-align: center;
          background: white;
          padding: 3rem;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          color: #667eea;
          margin: 0 0 1rem 0;
          font-size: 2.5rem;
        }
        .status {
          color: #10b981;
          font-size: 1.2rem;
          margin: 1rem 0;
        }
        .links {
          margin-top: 2rem;
        }
        a {
          display: inline-block;
          margin: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          transition: background 0.3s;
        }
        a:hover {
          background: #764ba2;
        }
        .info {
          margin-top: 1.5rem;
          color: #6b7280;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Letter My Backend</h1>
        <div class="status">✅ 서버가 정상적으로 실행 중입니다</div>
        <div class="info">
          <p>포트: ${process.env.PORT || 5000}</p>
        </div>
        <div class="links">
          <a href="/api-docs">📚 API 문서 (Swagger)</a>
          <a href="/api/health">🏥 Health Check</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Swagger UI (개발 전용)
if (process.env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
}

// API routes
app.use("/api", routes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Setup cron jobs
if (process.env.NODE_ENV === "production") {
  setupDraftCleanupJob();
}

export default app;
