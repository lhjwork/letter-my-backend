import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { specs } from "./config/swagger";
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
          <p>환경: ${process.env.NODE_ENV || 'development'}</p>
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

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// API routes
app.use("/api", routes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
