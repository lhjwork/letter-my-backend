import { Request, Response, NextFunction } from "express";
import letterService from "../services/letterService";
import { LetterCategory } from "../models/Letter";

// Letter Controller 클래스
export class LetterController {
  // 편지 생성
  async createLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { title, content, authorName, ogPreviewMessage, ogBgColor, ogIllustration, ogFontSize } = req.body;

      if (!title || !content || !authorName) {
        res.status(400).json({ success: false, message: "Title, content, and authorName are required" });
        return;
      }

      const letter = await letterService.createLetter({
        userId: req.user.userId,
        title,
        content,
        authorName,
        ogPreviewMessage,
        ogBgColor,
        ogIllustration,
        ogFontSize,
      });

      res.status(201).json({ success: true, data: letter, message: "Letter created successfully" });
    } catch (error) {
      next(error);
    }
  }

  // 사연 생성 (POST /api/letters/story)
  async createStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, content, authorName, category, ogPreviewMessage } = req.body;

      if (!title || !content) {
        res.status(400).json({ success: false, message: "Title and content are required" });
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

      res.status(201).json({ success: true, data: letter, message: "Story created successfully" });
    } catch (error) {
      next(error);
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
        res.status(400).json({ success: false, message: "Invalid page or limit parameter" });
        return;
      }

      const result = await letterService.getStories({
        page,
        limit,
        search: search || undefined,
        sort,
        category: category || undefined,
      });

      res.status(200).json({ success: true, data: result.stories, pagination: result.pagination });
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ success: false, message: "사연 목록을 불러오는데 실패했습니다" });
    }
  }

  // 카테고리별 통계 조회 (GET /api/letters/categories/stats)
  async getCategoryStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await letterService.getCategoryStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error("Error fetching category stats:", error);
      res.status(500).json({ success: false, message: "통계 조회에 실패했습니다" });
    }
  }

  // ID로 편지 조회 (조회수 증가)
  async getLetterById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const letter = await letterService.incrementViewCount(id);

      if (!letter) {
        res.status(404).json({ success: false, message: "Letter not found" });
        return;
      }

      res.status(200).json({ success: true, data: letter });
    } catch (error) {
      next(error);
    }
  }

  // 내 편지 목록 조회
  async getMyLetters(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const letters = await letterService.findByUserId(req.user.userId);
      res.status(200).json({ success: true, data: letters });
    } catch (error) {
      console.error("Error fetching user letters:", error);
      res.status(500).json({ success: false, message: "서버 오류가 발생했습니다" });
    }
  }

  // 모든 편지 조회 (페이지네이션)
  async getAllLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await letterService.findAll(page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // 편지 업데이트
  async updateLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      const { title, content, authorName, category, ogPreviewMessage, ogBgColor, ogIllustration, ogFontSize } = req.body;

      const existingLetter = await letterService.findById(id);
      if (!existingLetter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다" });
        return;
      }

      if (existingLetter.userId?.toString() !== req.user.userId) {
        res.status(403).json({ success: false, message: "이 편지를 수정할 권한이 없습니다" });
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

      res.status(200).json({ success: true, data: letter, message: "Letter updated successfully" });
    } catch (error) {
      next(error);
    }
  }

  // 편지 삭제
  async deleteLetter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { id } = req.params;

      const existingLetter = await letterService.findById(id);
      if (!existingLetter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다" });
        return;
      }

      if (existingLetter.userId?.toString() !== req.user.userId) {
        res.status(403).json({ success: false, message: "이 편지를 삭제할 권한이 없습니다" });
        return;
      }

      await letterService.deleteLetter(id);
      res.status(200).json({ success: true, message: "편지가 삭제되었습니다", data: { _id: id } });
    } catch (error) {
      console.error("Error deleting letter:", error);
      res.status(500).json({ success: false, message: "편지 삭제에 실패했습니다" });
    }
  }
}

// Controller 인스턴스 생성 및 내보내기
export default new LetterController();
