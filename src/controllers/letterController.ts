import { Request, Response, NextFunction } from "express";
import letterService from "../services/letterService";

export class LetterController {
  // 편지 생성
  async createLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { title, content, authorName } = req.body;

      const letter = await letterService.createLetter({
        title,
        content,
        authorName,
        userId: req.user.userId,
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

  // 모든 편지 조회
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

  // 내 편지 조회
  async getMyLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await letterService.findByUserId(req.user.userId, page, limit);

      res.status(200).json({
        success: true,
        data: result,
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

  // 편지 수정
  async updateLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      const { title, content, authorName } = req.body;

      const updatedLetter = await letterService.updateLetter(id, req.user.userId, {
        title,
        content,
        authorName,
      });

      if (!updatedLetter) {
        res.status(404).json({ message: "Letter not found or unauthorized" });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedLetter,
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
      const success = await letterService.deleteLetter(id, req.user.userId);

      if (!success) {
        res.status(404).json({ message: "Letter not found or unauthorized" });
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

export default new LetterController();
