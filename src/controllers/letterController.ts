import { Request, Response, NextFunction } from "express";
import letterService from "../services/letterService";

// Letter Controller 클래스
export class LetterController {
  // 편지 생성
  async createLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { content, ogPreviewMessage } = req.body;

      if (!content) {
        res.status(400).json({ message: "Content is required" });
        return;
      }

      const letter = await letterService.createLetter({
        userId: req.user.userId,
        content,
        ogPreviewMessage,
      });

      res.status(201).json({
        success: true,
        data: letter,
        message: "Letter created successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // ID로 편지 조회
  async getLetterById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const letter = await letterService.findById(id);

      if (!letter) {
        res.status(404).json({ message: "Letter not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: letter,
      });
    } catch (error) {
      next(error);
    }
  }

  // 내 편지 목록 조회
  async getMyLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const letters = await letterService.findByUserId(req.user.userId);

      res.status(200).json({
        success: true,
        data: letters,
      });
    } catch (error) {
      next(error);
    }
  }

  // 모든 편지 조회 (페이지네이션)
  async getAllLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await letterService.findAll(page, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 편지 업데이트
  async updateLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      const { content, ogPreviewMessage } = req.body;

      // 편지 존재 및 권한 확인
      const existingLetter = await letterService.findById(id);
      if (!existingLetter) {
        res.status(404).json({ message: "Letter not found" });
        return;
      }

      if (existingLetter.userId !== req.user.userId) {
        res.status(403).json({ message: "Forbidden: You can only update your own letters" });
        return;
      }

      const letter = await letterService.updateLetter(id, {
        content,
        ogPreviewMessage,
      });

      res.status(200).json({
        success: true,
        data: letter,
        message: "Letter updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // 편지 삭제
  async deleteLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { id } = req.params;

      // 편지 존재 및 권한 확인
      const existingLetter = await letterService.findById(id);
      if (!existingLetter) {
        res.status(404).json({ message: "Letter not found" });
        return;
      }

      if (existingLetter.userId !== req.user.userId) {
        res.status(403).json({ message: "Forbidden: You can only delete your own letters" });
        return;
      }

      const deleted = await letterService.deleteLetter(id);

      if (!deleted) {
        res.status(404).json({ message: "Letter not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Letter deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

// Controller 인스턴스 생성 및 내보내기
export default new LetterController();
