import { Request, Response, NextFunction } from "express";
import letterService from "../services/letterService";
import letterCreateService from "../services/letterCreateService";
import { LetterCategory } from "../models/Letter";

// Letter Controller 클래스
export class LetterController {
  // 편지 생성 (새로운 URL 공유 방식)
  async createLetterNew(req: Request, res: Response): Promise<void> {
    console.log("=== CREATE LETTER NEW ===");
    console.log("Request body:", req.body);
    console.log("Request user:", req.user);

    try {
      if (!req.user) {
        console.log("❌ No user in request");
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const { title, content, type, category, ogTitle, ogPreviewText, aiGenerated, aiModel, recipientAddresses } = req.body;
      console.log("📝 Extracted fields:", { title, content, type, category, recipientAddresses });

      // 기본 검증
      if (!title || !content) {
        console.log("❌ Missing title or content");
        res.status(400).json({
          success: false,
          message: "제목과 내용은 필수입니다.",
          details: {
            title: !title ? "제목이 누락되었습니다." : null,
            content: !content ? "내용이 누락되었습니다." : null,
          },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      if (!["story", "friend"].includes(type)) {
        console.log("❌ Invalid type:", type);
        res.status(400).json({
          success: false,
          message: "올바른 편지 타입을 선택해주세요.",
          details: {
            type: `'${type}'은(는) 유효하지 않은 타입입니다. 'story' 또는 'friend'를 선택해주세요.`,
          },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      // 사용자 정보 조회
      console.log("👤 Looking up user:", req.user.userId);
      const User = require("../models/User").default;
      const user = await User.findById(req.user.userId);
      if (!user) {
        console.log("❌ User not found:", req.user.userId);
        res.status(404).json({
          success: false,
          message: "사용자를 찾을 수 없습니다.",
          details: {
            userId: req.user.userId,
          },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      console.log("✅ User found:", user.name);
      console.log("📤 Calling letterCreateService...");

      const result = await letterCreateService.createLetter(req.user.userId, user.name, {
        title,
        content,
        type,
        category,
        ogTitle,
        ogPreviewText,
        aiGenerated,
        aiModel,
        recipientAddresses,
      });

      console.log("✅ Letter created successfully:", result);

      res.status(201).json({
        success: true,
        message: "편지가 성공적으로 생성되었습니다.",
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error: unknown) {
      console.error("❌ 편지 생성 에러:", error);

      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        // 특정 에러 메시지에 따른 상태 코드 설정
        if (error.message.includes("한도")) {
          res.status(429).json({
            success: false,
            message: error.message,
            errorType: "RATE_LIMIT_EXCEEDED",
            meta: { timestamp: new Date().toISOString() },
          });
        } else if (error.message.includes("필수") || error.message.includes("유효하지")) {
          res.status(400).json({
            success: false,
            message: error.message,
            errorType: "VALIDATION_ERROR",
            meta: { timestamp: new Date().toISOString() },
          });
        } else {
          res.status(500).json({
            success: false,
            message: error.message,
            errorType: "INTERNAL_ERROR",
            meta: { timestamp: new Date().toISOString() },
          });
        }
      } else {
        console.error("Unknown error type:", typeof error);
        res.status(500).json({
          success: false,
          message: "편지 생성에 실패했습니다.",
          errorType: "UNKNOWN_ERROR",
          meta: { timestamp: new Date().toISOString() },
        });
      }
    }
  }

  // 편지 조회 (새로운 URL 공유 방식)
  async getLetterByIdNew(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const viewerId = req.user?.userId;

      if (!letterId) {
        res.status(400).json({
          success: false,
          message: "편지 ID가 필요합니다.",
          errorType: "MISSING_PARAMETER",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      const letter = await letterCreateService.getLetter(letterId, viewerId);

      res.json({
        success: true,
        data: letter,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error: unknown) {
      console.error("편지 조회 에러:", error);

      if (error instanceof Error) {
        const message = error.message;

        if (message.includes("올바르지 않은") || message.includes("유효하지 않은")) {
          res.status(400).json({
            success: false,
            message,
            errorType: "INVALID_ID",
            meta: { timestamp: new Date().toISOString() },
          });
        } else if (message.includes("찾을 수 없습니다")) {
          res.status(404).json({
            success: false,
            message,
            errorType: "NOT_FOUND",
            meta: { timestamp: new Date().toISOString() },
          });
        } else if (message.includes("권한이 없습니다")) {
          res.status(403).json({
            success: false,
            message,
            errorType: "ACCESS_DENIED",
            meta: { timestamp: new Date().toISOString() },
          });
        } else {
          res.status(500).json({
            success: false,
            message,
            errorType: "INTERNAL_ERROR",
            meta: { timestamp: new Date().toISOString() },
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: "편지 조회에 실패했습니다.",
          errorType: "UNKNOWN_ERROR",
          meta: { timestamp: new Date().toISOString() },
        });
      }
    }
  }

  // 편지 생성 통계 조회
  async getLetterStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const stats = await letterCreateService.getLetterStats(req.user.userId);

      res.json({
        success: true,
        data: stats,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "통계 조회에 실패했습니다.";
      res.status(500).json({ success: false, message, meta: { timestamp: new Date().toISOString() } });
    }
  }

  // 사연 생성 (POST /api/letters/story)
  async createStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, content, authorName, category, ogPreviewMessage } = req.body;

      if (!title || !content) {
        res.status(400).json({ success: false, message: "제목과 내용은 필수입니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const letter = await letterService.createStory({
        userId: req.user?.userId,
        title,
        content,
        authorName: authorName || "익명",
        category: category as LetterCategory,
        ogPreviewMessage,
      });

      res.status(201).json({ success: true, data: letter, message: "사연이 성공적으로 생성되었습니다.", meta: { timestamp: new Date().toISOString() } });
    } catch (error) {
      next(error);
    }
  }

  // Featured Stories 조회 (GET /api/letters/stories/featured)
  async getFeaturedStories(_req: Request, res: Response): Promise<void> {
    try {
      const stories = await letterService.getFeaturedStories();
      
      res.status(200).json({
        success: true,
        data: stories,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error fetching featured stories:", error);
      res.status(500).json({
        success: false,
        message: "서버 오류가 발생했습니다",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 사연 목록 조회 (GET /api/letters/stories)
  async getStories(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const search = (req.query.search as string) || "";
      const sort = (req.query.sort as "latest" | "oldest" | "popular") || "latest";
      const category = (req.query.category as string) || "";

      if (page < 1 || limit < 1) {
        res.status(400).json({ success: false, message: "page와 limit은 1 이상의 값이어야 합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const result = await letterService.getStories({
        page,
        limit,
        search: search || undefined,
        sort,
        category: category || undefined,
      });

      res.status(200).json({ success: true, data: result.stories, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } });
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ success: false, message: "사연 목록을 불러오는데 실패했습니다", meta: { timestamp: new Date().toISOString() } });
    }
  }

  // 카테고리별 통계 조회 (GET /api/letters/categories/stats)
  async getCategoryStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await letterService.getCategoryStats();
      res.status(200).json({ success: true, data: stats, meta: { timestamp: new Date().toISOString() } });
    } catch (error) {
      console.error("Error fetching category stats:", error);
      res.status(500).json({ success: false, message: "통계 조회에 실패했습니다", meta: { timestamp: new Date().toISOString() } });
    }
  }

  // ID로 편지 조회 (본인 글이 아닌 경우에만 조회수 증가)
  async getLetterById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.userId;

      // 먼저 편지 조회
      const letter = await letterService.findById(id);

      if (!letter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      // 본인 글이 아닌 경우에만 조회수 증가
      const isOwnLetter = letter.userId?.toString() === currentUserId;
      if (!isOwnLetter) {
        await letterService.incrementViewCount(id);
        letter.viewCount += 1; // 응답에 반영
      }

      res.status(200).json({ success: true, data: letter, meta: { timestamp: new Date().toISOString() } });
    } catch (error) {
      next(error);
    }
  }

  // 내 편지 목록 조회 (페이지네이션 + filter 지원)
  async getMyLetters(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const filter = (req.query.filter as "all" | "sent" | "received") || "all";

      // 파라미터 검증
      if (page < 1 || limit < 1) {
        res.status(400).json({
          success: false,
          message: "page와 limit은 1 이상의 값이어야 합니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      if (!["all", "sent", "received"].includes(filter)) {
        res.status(400).json({
          success: false,
          message: "filter는 'all', 'sent', 'received' 중 하나여야 합니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      const result = await letterService.findMyLettersWithFilter(req.user.userId, filter, page, limit);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error fetching user letters:", error);
      res.status(500).json({ success: false, message: "편지 목록을 불러오는데 실패했습니다.", meta: { timestamp: new Date().toISOString() } });
    }
  }

  // 편지 저장 (받은 편지로 보관)
  async saveLetterToCollection(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const { letterId } = req.params;
      const result = await letterService.saveLetter(letterId, req.user.userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error: unknown) {
      console.error("Error saving letter:", error);
      const message = error instanceof Error ? error.message : "편지 저장에 실패했습니다.";
      const status = message.includes("찾을 수 없습니다") ? 404 : message.includes("올바르지 않은") ? 400 : 500;
      res.status(status).json({ success: false, error: message, meta: { timestamp: new Date().toISOString() } });
    }
  }

  // 편지 저장 취소
  async unsaveLetterFromCollection(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const { letterId } = req.params;
      const result = await letterService.unsaveLetter(letterId, req.user.userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error: unknown) {
      console.error("Error unsaving letter:", error);
      const message = error instanceof Error ? error.message : "편지 저장 취소에 실패했습니다.";
      const status = message.includes("찾을 수 없습니다") ? 404 : message.includes("올바르지 않은") ? 400 : 500;
      res.status(status).json({ success: false, error: message, meta: { timestamp: new Date().toISOString() } });
    }
  }

  // 편지 저장 여부 확인
  async checkLetterSaveStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const { letterId } = req.params;
      const isSaved = await letterService.checkLetterSaved(letterId, req.user.userId);

      res.status(200).json({
        success: true,
        data: { isSaved },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error: unknown) {
      console.error("Error checking letter save status:", error);
      const message = error instanceof Error ? error.message : "저장 상태 확인에 실패했습니다.";
      const status = message.includes("찾을 수 없습니다") ? 404 : message.includes("올바르지 않은") ? 400 : 500;
      res.status(status).json({ success: false, error: message, meta: { timestamp: new Date().toISOString() } });
    }
  }
  // 내 사연 목록 조회 (페이지네이션 지원)
  async getMyStories(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      // 파라미터 검증
      if (page < 1 || limit < 1) {
        res.status(400).json({
          success: false,
          message: "page와 limit은 1 이상의 값이어야 합니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      const result = await letterService.findStoriesByUserId(req.user.userId, page, limit);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error fetching user stories:", error);
      res.status(500).json({ success: false, message: "사연 목록을 불러오는데 실패했습니다.", meta: { timestamp: new Date().toISOString() } });
    }
  }

  // 모든 편지 조회 (페이지네이션)
  async getAllLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const result = await letterService.findAll(page, limit);
      res.status(200).json({ success: true, data: result, meta: { timestamp: new Date().toISOString() } });
    } catch (error) {
      next(error);
    }
  }

  // 편지 업데이트
  async updateLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const { id } = req.params;
      const { title, content, authorName, category, ogPreviewMessage, ogBgColor, ogIllustration, ogFontSize } = req.body;

      const existingLetter = await letterService.findById(id);
      if (!existingLetter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      if (existingLetter.userId?.toString() !== req.user.userId) {
        res.status(403).json({ success: false, message: "이 편지를 수정할 권한이 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const letter = await letterService.updateLetter(id, {
        title,
        content,
        authorName,
        category,
        ogPreviewMessage,
        ogBgColor,
        ogIllustration,
        ogFontSize,
      });

      res.status(200).json({ success: true, data: letter, message: "편지가 성공적으로 수정되었습니다.", meta: { timestamp: new Date().toISOString() } });
    } catch (error) {
      next(error);
    }
  }

  // 편지 삭제
  async deleteLetter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const { id } = req.params;

      const existingLetter = await letterService.findById(id);
      if (!existingLetter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      if (existingLetter.userId?.toString() !== req.user.userId) {
        res.status(403).json({ success: false, message: "이 편지를 삭제할 권한이 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      await letterService.deleteLetter(id);
      res.status(200).json({ success: true, message: "편지가 삭제되었습니다", data: { _id: id }, meta: { timestamp: new Date().toISOString() } });
    } catch (error) {
      console.error("Error deleting letter:", error);
      res.status(500).json({ success: false, message: "편지 삭제에 실패했습니다", meta: { timestamp: new Date().toISOString() } });
    }
  }

  // ==================== 수신자 주소 관리 메서드 ====================

  // 수신자 주소 추가
  async addRecipientAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const { id } = req.params;
      const { name, phone, zipCode, address1, address2, memo } = req.body;

      const Letter = require("../models/Letter").default;
      const letter = await Letter.findById(id);

      if (!letter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      if (letter.userId?.toString() !== req.user.userId) {
        res.status(403).json({ success: false, message: "이 편지를 수정할 권한이 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const newAddress = {
        name,
        phone,
        zipCode,
        address1,
        address2,
        memo,
        addedAt: new Date(),
      };

      letter.recipientAddresses.push(newAddress);
      await letter.save();

      res.status(201).json({
        success: true,
        message: "수신자 주소가 추가되었습니다.",
        data: newAddress,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error adding recipient address:", error);
      res.status(500).json({ success: false, message: "수신자 주소 추가에 실패했습니다.", meta: { timestamp: new Date().toISOString() } });
    }
  }

  // 수신자 주소 목록 조회
  async getRecipientAddresses(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const { id } = req.params;

      const Letter = require("../models/Letter").default;
      const letter = await Letter.findById(id);

      if (!letter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      if (letter.userId?.toString() !== req.user.userId) {
        res.status(403).json({ success: false, message: "이 편지의 수신자 주소를 조회할 권한이 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      res.status(200).json({
        success: true,
        data: letter.recipientAddresses,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error getting recipient addresses:", error);
      res.status(500).json({ success: false, message: "수신자 주소 조회에 실패했습니다.", meta: { timestamp: new Date().toISOString() } });
    }
  }

  // 수신자 주소 수정
  async updateRecipientAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const { id, addressId } = req.params;
      const { name, phone, zipCode, address1, address2, memo } = req.body;

      const Letter = require("../models/Letter").default;
      const letter = await Letter.findById(id);

      if (!letter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      if (letter.userId?.toString() !== req.user.userId) {
        res.status(403).json({ success: false, message: "이 편지를 수정할 권한이 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const addressIndex = letter.recipientAddresses.findIndex((addr: any) => addr._id.toString() === addressId);
      if (addressIndex === -1) {
        res.status(404).json({ success: false, message: "수신자 주소를 찾을 수 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      letter.recipientAddresses[addressIndex] = {
        ...letter.recipientAddresses[addressIndex],
        name,
        phone,
        zipCode,
        address1,
        address2,
        memo,
      };

      await letter.save();

      res.status(200).json({
        success: true,
        message: "수신자 주소가 수정되었습니다.",
        data: letter.recipientAddresses[addressIndex],
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error updating recipient address:", error);
      res.status(500).json({ success: false, message: "수신자 주소 수정에 실패했습니다.", meta: { timestamp: new Date().toISOString() } });
    }
  }

  // 수신자 주소 삭제
  async deleteRecipientAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "로그인이 필요합니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const { id, addressId } = req.params;

      const Letter = require("../models/Letter").default;
      const letter = await Letter.findById(id);

      if (!letter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      if (letter.userId?.toString() !== req.user.userId) {
        res.status(403).json({ success: false, message: "이 편지를 수정할 권한이 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const addressIndex = letter.recipientAddresses.findIndex((addr: any) => addr._id.toString() === addressId);
      if (addressIndex === -1) {
        res.status(404).json({ success: false, message: "수신자 주소를 찾을 수 없습니다.", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      letter.recipientAddresses.splice(addressIndex, 1);
      await letter.save();

      res.status(200).json({
        success: true,
        message: "수신자 주소가 삭제되었습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error deleting recipient address:", error);
      res.status(500).json({ success: false, message: "수신자 주소 삭제에 실패했습니다.", meta: { timestamp: new Date().toISOString() } });
    }
  }
}

// Controller 인스턴스 생성 및 내보내기
export default new LetterController();
