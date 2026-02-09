# 🔌 Letter SEO 백엔드 API 가이드

## 📋 API 엔드포인트

### 1. SEO 메타데이터 조회 (Public)

```
GET /api/seo/metadata
```

**Query Parameters:**
- `url` (required): 조회할 URL 경로 (예: `/`, `/stories`, `/letters/123`)
- `letterId` (optional): 개별 사연 ID

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "사연 제목 - Letter",
    "description": "사연 내용 미리보기...",
    "keywords": ["가족", "사연", "편지"],
    "ogTitle": "사연 제목",
    "ogDescription": "사연 내용 미리보기...",
    "ogImage": "https://example.com/og-image.png",
    "ogType": "article",
    "twitterCard": "summary_large_image",
    "twitterTitle": "사연 제목",
    "twitterDescription": "사연 내용 미리보기...",
    "twitterImage": "https://example.com/og-image.png",
    "canonicalUrl": "https://example.com/letters/123",
    "robots": {
      "index": true,
      "follow": true
    },
    "structuredData": {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "사연 제목"
    }
  }
}
```

---

### 2. Admin SEO Config 생성 (Admin Only)

```
POST /api/admin/seo/configs
```

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Request Body:**
```json
{
  "urlPattern": "/stories",
  "patternType": "exact",
  "metaTitle": "사연 모음 - Letter",
  "metaDescription": "진심 어린 사연을 만나보세요",
  "metaKeywords": ["사연", "편지", "감동"],
  "ogTitle": "사연 모음",
  "ogDescription": "진심 어린 사연 모음",
  "ogImage": "https://example.com/og-stories.png",
  "ogType": "website",
  "twitterCard": "summary_large_image",
  "structuredData": {
    "@context": "https://schema.org",
    "@type": "CollectionPage"
  },
  "canonicalUrl": "https://example.com/stories",
  "robots": {
    "index": true,
    "follow": true
  },
  "priority": 80,
  "isActive": true,
  "notes": "사연 목록 페이지 SEO 설정"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SEO 설정이 생성되었습니다",
  "data": {
    "_id": "seo_config_id",
    "urlPattern": "/stories",
    "metaTitle": "사연 모음 - Letter",
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### 3. Admin SEO Config 목록 조회 (Admin Only)

```
GET /api/admin/seo/configs
```

**Query Parameters:**
- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지당 개수 (기본값: 20)
- `patternType` (optional): "exact" | "dynamic"
- `isActive` (optional): true | false

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "config_id_1",
      "urlPattern": "/",
      "patternType": "exact",
      "metaTitle": "Letter - 마음을 전하는 편지 플랫폼",
      "priority": 100,
      "isActive": true,
      "createdAt": "2026-01-15T10:00:00.000Z"
    },
    {
      "_id": "config_id_2",
      "urlPattern": "/letters/{letterId}",
      "patternType": "dynamic",
      "metaTitle": "{letterTitle} - Letter",
      "priority": 70,
      "isActive": true,
      "createdAt": "2026-01-15T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

---

### 4. Admin SEO Config 수정 (Admin Only)

```
PATCH /api/admin/seo/configs/:id
```

**Request Body:** (수정할 필드만 전송)
```json
{
  "metaTitle": "새로운 타이틀",
  "metaDescription": "새로운 설명",
  "priority": 90
}
```

**Response:**
```json
{
  "success": true,
  "message": "SEO 설정이 수정되었습니다",
  "data": {
    "_id": "config_id",
    "urlPattern": "/stories",
    "metaTitle": "새로운 타이틀",
    "updatedAt": "2026-01-15T12:00:00.000Z"
  }
}
```

---

### 5. Admin SEO Config 삭제 (Admin Only)

```
DELETE /api/admin/seo/configs/:id
```

**Response:**
```json
{
  "success": true,
  "message": "SEO 설정이 삭제되었습니다"
}
```

---

### 6. SEO Config 미리보기 (Admin Only)

```
POST /api/admin/seo/preview
```

**Request Body:**
```json
{
  "urlPattern": "/stories/category/가족",
  "metaTitle": "가족 사연 모음",
  "metaDescription": "가족에 관한 따뜻한 사연들",
  "ogImage": "https://example.com/og-family.png"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "googlePreview": {
      "title": "가족 사연 모음",
      "url": "example.com › stories › category › 가족",
      "description": "가족에 관한 따뜻한 사연들"
    },
    "facebookPreview": {
      "title": "가족 사연 모음",
      "description": "가족에 관한 따뜻한 사연들",
      "image": "https://example.com/og-family.png"
    },
    "twitterPreview": {
      "card": "summary_large_image",
      "title": "가족 사연 모음",
      "description": "가족에 관한 따뜻한 사연들",
      "image": "https://example.com/og-family.png"
    }
  }
}
```

---

## 🔧 컨트롤러 구현

### SEO Controller

```typescript
// src/controllers/seoController.ts
import { Request, Response } from "express";
import seoService from "../services/seoService";

export class SEOController {
  /**
   * SEO 메타데이터 조회 (Public)
   */
  async getMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { url, letterId } = req.query;
      
      if (!url || typeof url !== "string") {
        res.status(400).json({
          success: false,
          message: "url 파라미터가 필요합니다",
        });
        return;
      }
      
      const metadata = await seoService.getSEOMetadata(
        url,
        letterId as string | undefined
      );
      
      res.json({
        success: true,
        data: metadata,
      });
    } catch (error) {
      console.error("SEO metadata fetch error:", error);
      res.status(500).json({
        success: false,
        message: "SEO 메타데이터 조회에 실패했습니다",
      });
    }
  }
}

export default new SEOController();
```

### Admin SEO Controller

```typescript
// src/controllers/adminSEOController.ts
import { Request, Response } from "express";
import SEOConfig from "../models/SEOConfig";

export class AdminSEOController {
  /**
   * SEO Config 생성
   */
  async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = new SEOConfig({
        ...req.body,
        createdBy: req.user?.userId,
      });
      
      await config.save();
      
      res.status(201).json({
        success: true,
        message: "SEO 설정이 생성되었습니다",
        data: config,
      });
    } catch (error) {
      console.error("SEO config creation error:", error);
      res.status(500).json({
        success: false,
        message: "SEO 설정 생성에 실패했습니다",
      });
    }
  }
  
  /**
   * SEO Config 목록 조회
   */
  async getConfigs(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      
      const query: any = {};
      if (req.query.patternType) {
        query.patternType = req.query.patternType;
      }
      if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === "true";
      }
      
      const [configs, total] = await Promise.all([
        SEOConfig.find(query)
          .sort({ priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        SEOConfig.countDocuments(query),
      ]);
      
      res.json({
        success: true,
        data: configs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("SEO configs fetch error:", error);
      res.status(500).json({
        success: false,
        message: "SEO 설정 목록 조회에 실패했습니다",
      });
    }
  }
  
  /**
   * SEO Config 수정
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const config = await SEOConfig.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true }
      );
      
      if (!config) {
        res.status(404).json({
          success: false,
          message: "SEO 설정을 찾을 수 없습니다",
        });
        return;
      }
      
      res.json({
        success: true,
        message: "SEO 설정이 수정되었습니다",
        data: config,
      });
    } catch (error) {
      console.error("SEO config update error:", error);
      res.status(500).json({
        success: false,
        message: "SEO 설정 수정에 실패했습니다",
      });
    }
  }
  
  /**
   * SEO Config 삭제
   */
  async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const config = await SEOConfig.findByIdAndDelete(id);
      
      if (!config) {
        res.status(404).json({
          success: false,
          message: "SEO 설정을 찾을 수 없습니다",
        });
        return;
      }
      
      res.json({
        success: true,
        message: "SEO 설정이 삭제되었습니다",
      });
    } catch (error) {
      console.error("SEO config deletion error:", error);
      res.status(500).json({
        success: false,
        message: "SEO 설정 삭제에 실패했습니다",
      });
    }
  }
  
  /**
   * SEO 미리보기
   */
  async previewSEO(req: Request, res: Response): Promise<void> {
    try {
      const { metaTitle, metaDescription, ogImage, urlPattern } = req.body;
      
      // URL에서 도메인 추출
      const domain = process.env.FRONTEND_URL?.replace(/^https?:\/\//, "") || "example.com";
      const urlParts = urlPattern.split("/").filter(Boolean);
      const breadcrumb = urlParts.join(" › ");
      
      res.json({
        success: true,
        data: {
          googlePreview: {
            title: metaTitle,
            url: `${domain} › ${breadcrumb}`,
            description: metaDescription,
          },
          facebookPreview: {
            title: metaTitle,
            description: metaDescription,
            image: ogImage,
          },
          twitterPreview: {
            card: "summary_large_image",
            title: metaTitle,
            description: metaDescription,
            image: ogImage,
          },
        },
      });
    } catch (error) {
      console.error("SEO preview error:", error);
      res.status(500).json({
        success: false,
        message: "SEO 미리보기 생성에 실패했습니다",
      });
    }
  }
}

export default new AdminSEOController();
```

---

## 🛣️ 라우트 설정

### Public SEO Routes

```typescript
// src/routes/seo.ts
import { Router } from "express";
import seoController from "../controllers/seoController";

const router = Router();

/**
 * @route   GET /api/seo/metadata
 * @desc    SEO 메타데이터 조회
 * @access  Public
 */
router.get("/metadata", seoController.getMetadata);

export default router;
```

### Admin SEO Routes

```typescript
// src/routes/adminSEO.ts
import { Router } from "express";
import adminSEOController from "../controllers/adminSEOController";
import { adminAuth } from "../middleware/adminAuth";
import { body } from "express-validator";
import { validate } from "../middleware/validation";

const router = Router();

// 모든 라우트에 관리자 인증 적용
router.use(adminAuth);

/**
 * @route   POST /api/admin/seo/configs
 * @desc    SEO Config 생성
 * @access  Admin
 */
router.post(
  "/configs",
  [
    body("urlPattern").trim().notEmpty().withMessage("URL 패턴이 필요합니다"),
    body("patternType").isIn(["exact", "dynamic"]).withMessage("올바른 패턴 타입을 선택해주세요"),
    body("metaTitle").optional().trim().isLength({ max: 60 }).withMessage("제목은 60자 이내여야 합니다"),
    body("metaDescription").optional().trim().isLength({ max: 160 }).withMessage("설명은 160자 이내여야 합니다"),
    body("priority").optional().isInt({ min: 0, max: 100 }).withMessage("우선순위는 0-100 사이여야 합니다"),
    validate,
  ],
  adminSEOController.createConfig
);

/**
 * @route   GET /api/admin/seo/configs
 * @desc    SEO Config 목록 조회
 * @access  Admin
 */
router.get("/configs", adminSEOController.getConfigs);

/**
 * @route   PATCH /api/admin/seo/configs/:id
 * @desc    SEO Config 수정
 * @access  Admin
 */
router.patch("/configs/:id", adminSEOController.updateConfig);

/**
 * @route   DELETE /api/admin/seo/configs/:id
 * @desc    SEO Config 삭제
 * @access  Admin
 */
router.delete("/configs/:id", adminSEOController.deleteConfig);

/**
 * @route   POST /api/admin/seo/preview
 * @desc    SEO 미리보기
 * @access  Admin
 */
router.post("/preview", adminSEOController.previewSEO);

export default router;
```

### App.ts에 라우트 등록

```typescript
// src/app.ts
import seoRoutes from "./routes/seo";
import adminSEORoutes from "./routes/adminSEO";

// ... 기존 코드 ...

// Public SEO Routes
app.use("/api/seo", seoRoutes);

// Admin SEO Routes
app.use("/api/admin/seo", adminSEORoutes);
```

---

## 📊 데이터베이스 인덱스 최적화

```typescript
// scripts/createSEOIndexes.ts
import mongoose from "mongoose";
import SEOConfig from "../src/models/SEOConfig";

async function createSEOIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    console.log("Creating SEO indexes...");
    
    // SEOConfig 인덱스
    await SEOConfig.collection.createIndex({ urlPattern: 1, priority: -1 });
    await SEOConfig.collection.createIndex({ patternType: 1, isActive: 1 });
    await SEOConfig.collection.createIndex({ createdAt: -1 });
    
    console.log("✅ SEO indexes created successfully");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    process.exit(1);
  }
}

createSEOIndexes();
```

---

## 🧪 테스트 예시

### cURL 테스트

```bash
# 1. SEO 메타데이터 조회 (Public)
curl -X GET "http://localhost:5001/api/seo/metadata?url=/stories" \
  -H "Content-Type: application/json"

# 2. 개별 사연 SEO 조회
curl -X GET "http://localhost:5001/api/seo/metadata?url=/letters/123&letterId=123" \
  -H "Content-Type: application/json"

# 3. Admin SEO Config 생성
curl -X POST "http://localhost:5001/api/admin/seo/configs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{
    "urlPattern": "/",
    "patternType": "exact",
    "metaTitle": "Letter - 마음을 전하는 편지 플랫폼",
    "metaDescription": "소중한 사람에게 진심을 담은 편지를 보내세요",
    "metaKeywords": ["편지", "사연", "감동"],
    "priority": 100,
    "isActive": true
  }'

# 4. SEO Config 목록 조회
curl -X GET "http://localhost:5001/api/admin/seo/configs?page=1&limit=20" \
  -H "Authorization: Bearer {admin_token}"

# 5. SEO 미리보기
curl -X POST "http://localhost:5001/api/admin/seo/preview" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{
    "urlPattern": "/stories",
    "metaTitle": "사연 모음 - Letter",
    "metaDescription": "진심 어린 사연을 만나보세요",
    "ogImage": "https://example.com/og-stories.png"
  }'
```

---

이 가이드를 따라 백엔드 API를 구현하면 프론트엔드에서 SEO 메타데이터를 쉽게 조회하고, 관리자가 Admin 패널에서 SEO를 관리할 수 있습니다.
