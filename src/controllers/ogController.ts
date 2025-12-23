import { Request, Response, NextFunction } from "express";
import letterService from "../services/letterService";
import path from "path";
import fs from "fs/promises";

// OG Controller 클래스
export class OgController {
  // 커스텀 OG 이미지 업로드
  async uploadCustomImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { letterId, ogPreviewMessage } = req.body;

      if (!letterId) {
        res.status(400).json({ message: "letterId is required" });
        return;
      }

      // Letter 존재 확인
      const letter = await letterService.findById(letterId);
      if (!letter) {
        res.status(404).json({ message: "Letter not found" });
        return;
      }

      // 파일 업로드 처리
      let ogImageUrl: string;

      if (req.body.file) {
        // base64 이미지 처리
        const base64Data = req.body.file.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // 저장 경로 설정
        const uploadDir = path.join(process.cwd(), "public", "og-custom");
        await fs.mkdir(uploadDir, { recursive: true });

        const filename = `${letterId}-${Date.now()}.png`;
        const filepath = path.join(uploadDir, filename);

        await fs.writeFile(filepath, buffer);

        // URL 생성 (환경변수에서 BASE_URL 가져오기)
        const baseUrl = process.env.BASE_URL || "http://localhost:3000";
        ogImageUrl = `${baseUrl}/og-custom/${filename}`;
      } else {
        res.status(400).json({ message: "Image file is required" });
        return;
      }

      // Letter 업데이트
      const updatedLetter = await letterService.updateCustomOgImage(letterId, ogImageUrl, ogPreviewMessage);

      res.status(200).json({
        success: true,
        ogImageUrl,
        data: updatedLetter,
      });
    } catch (error) {
      next(error);
    }
  }

  // 자동 생성된 OG 이미지 URL 저장
  async autoGenerate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { letterId, ogImageUrl } = req.body;

      if (!letterId || !ogImageUrl) {
        res.status(400).json({ message: "letterId and ogImageUrl are required" });
        return;
      }

      // Letter 존재 확인
      const letter = await letterService.findById(letterId);
      if (!letter) {
        res.status(404).json({ message: "Letter not found" });
        return;
      }

      // Letter 업데이트
      const updatedLetter = await letterService.updateAutoOgImage(letterId, ogImageUrl);

      res.status(200).json({
        success: true,
        data: updatedLetter,
      });
    } catch (error) {
      next(error);
    }
  }

  // OG 이미지 URL 조회
  async getOgImageUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { letterId } = req.params;

      const letter = await letterService.findById(letterId);

      if (!letter) {
        res.status(404).json({ message: "Letter not found" });
        return;
      }

      res.status(200).json({
        success: true,
        ogImageUrl: letter.ogImageUrl || null,
        ogImageType: letter.ogImageType,
        ogPreviewMessage: letter.ogPreviewText,
      });
    } catch (error) {
      next(error);
    }
  }
}

// Controller 인스턴스 생성 및 내보내기
export default new OgController();
