import { Request, Response, NextFunction } from "express";
import letterService from "../services/letterService";
import path from "path";
import fs from "fs/promises";
import { sendSuccess, sendBadRequest, sendNotFound } from "../utils/response";

// OG Controller 클래스
export class OgController {
  // 커스텀 OG 이미지 업로드
  async uploadCustomImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { letterId, ogPreviewMessage } = req.body;

      if (!letterId) {
        sendBadRequest(res, "letterId는 필수입니다");
        return;
      }

      const letter = await letterService.findById(letterId);
      if (!letter) {
        sendNotFound(res, "편지를 찾을 수 없습니다");
        return;
      }

      let ogImageUrl: string;

      if (req.body.file) {
        const base64Data = req.body.file.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const uploadDir = path.join(process.cwd(), "public", "og-custom");
        await fs.mkdir(uploadDir, { recursive: true });

        const filename = `${letterId}-${Date.now()}.png`;
        const filepath = path.join(uploadDir, filename);

        await fs.writeFile(filepath, buffer);

        const baseUrl = process.env.BASE_URL || "http://localhost:3000";
        ogImageUrl = `${baseUrl}/og-custom/${filename}`;
      } else {
        sendBadRequest(res, "이미지 파일이 필요합니다");
        return;
      }

      const updatedLetter = await letterService.updateCustomOgImage(letterId, ogImageUrl, ogPreviewMessage);

      sendSuccess(res, { ogImageUrl, letter: updatedLetter }, "OG 이미지가 업로드되었습니다");
    } catch (error) {
      next(error);
    }
  }

  // 자동 생성된 OG 이미지 URL 저장
  async autoGenerate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { letterId, ogImageUrl } = req.body;

      if (!letterId || !ogImageUrl) {
        sendBadRequest(res, "letterId와 ogImageUrl은 필수입니다");
        return;
      }

      const letter = await letterService.findById(letterId);
      if (!letter) {
        sendNotFound(res, "편지를 찾을 수 없습니다");
        return;
      }

      const updatedLetter = await letterService.updateAutoOgImage(letterId, ogImageUrl);

      sendSuccess(res, updatedLetter, "OG 이미지 URL이 저장되었습니다");
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
        sendNotFound(res, "편지를 찾을 수 없습니다");
        return;
      }

      sendSuccess(res, {
        ogImageUrl: letter.ogImageUrl || null,
        ogImageType: letter.ogImageType,
      }, "OG 이미지 정보를 조회했습니다");
    } catch (error) {
      next(error);
    }
  }
}

// Controller 인스턴스 생성 및 내보내기
export default new OgController();
