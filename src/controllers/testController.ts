import { Request, Response, NextFunction } from "express";
import testService from "../services/testService";

// Test Controller 클래스
export class TestController {
  // 모든 테스트 조회
  // next : Express가 미들웨어 체인에서 제공하는 함수
  async getAllTests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await testService.findAll(page, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ID로 테스트 조회
  async getTestById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const test = await testService.findById(id);

      if (!test) {
        res.status(404).json({ message: "Test not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: test,
      });
    } catch (error) {
      next(error);
    }
  }

  // 상태로 테스트 조회
  async getTestsByStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.params;

      const tests = await testService.findByStatus(status);

      res.status(200).json({
        success: true,
        data: tests,
      });
    } catch (error) {
      next(error);
    }
  }

  // 우선순위로 테스트 조회
  async getTestsByPriority(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const minPriority = parseInt(req.query.min as string) || 1;

      const tests = await testService.findByPriority(minPriority);

      res.status(200).json({
        success: true,
        data: tests,
      });
    } catch (error) {
      next(error);
    }
  }

  // 내가 만든 테스트 조회
  async getMyTests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const tests = await testService.findByCreator(req.user.email);

      res.status(200).json({
        success: true,
        data: tests,
      });
    } catch (error) {
      next(error);
    }
  }

  // 테스트 생성
  async createTest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { title, description, priority, status } = req.body;

      const test = await testService.createTest({
        title,
        description,
        priority,
        status,
        createdBy: req.user.email,
      });

      res.status(201).json({
        success: true,
        data: test,
        message: "Test created successfully",
      });
    } catch (error: any) {
      if (error.message === "You already have a test with this title") {
        res.status(409).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  // 테스트 업데이트
  async updateTest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, status, priority } = req.body;

      const test = await testService.updateTest(id, {
        title,
        description,
        status,
        priority,
      });

      if (!test) {
        res.status(404).json({ message: "Test not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: test,
        message: "Test updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // 테스트 상태 변경
  async changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const test = await testService.changeStatus(id, status);

      res.status(200).json({
        success: true,
        data: test,
        message: "Test status changed successfully",
      });
    } catch (error: any) {
      if (error.message === "Test not found" || error.message?.includes("Cannot change")) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  // 테스트 삭제
  async deleteTest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await testService.deleteTest(id);

      if (!deleted) {
        res.status(404).json({ message: "Test not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Test deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // 전체 통계
  async getStatistics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await testService.getStatistics();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // 내 통계
  async getMyStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const stats = await testService.getStatisticsByCreator(req.user.email);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

// Controller 인스턴스 생성 및 내보내기
export default new TestController();
