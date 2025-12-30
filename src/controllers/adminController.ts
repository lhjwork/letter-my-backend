import { Request, Response } from "express";
import adminService from "../services/adminService";

class AdminController {
  // ===== 관리자 관리 =====

  async getAdmins(req: Request, res: Response): Promise<void> {
    try {
      const result = await adminService.getAdmins(req.query as Record<string, unknown>);
      res.json({ success: true, ...result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "관리자 목록 조회 실패";
      res.status(500).json({ success: false, message });
    }
  }

  async createAdmin(req: Request, res: Response): Promise<void> {
    try {
      const admin = await adminService.createAdmin(req.body);
      res.status(201).json({ success: true, data: admin, message: "관리자가 생성되었습니다" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "관리자 생성 실패";
      res.status(400).json({ success: false, message });
    }
  }

  async getAdminById(req: Request, res: Response): Promise<void> {
    try {
      const admin = await adminService.getAdminById(req.params.id);
      if (!admin) {
        res.status(404).json({ success: false, message: "관리자를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, data: admin });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "관리자 조회 실패";
      res.status(500).json({ success: false, message });
    }
  }

  async updateAdmin(req: Request, res: Response): Promise<void> {
    try {
      const admin = await adminService.updateAdmin(req.params.id, req.body);
      if (!admin) {
        res.status(404).json({ success: false, message: "관리자를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, data: admin, message: "관리자가 수정되었습니다" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "관리자 수정 실패";
      res.status(400).json({ success: false, message });
    }
  }

  async deleteAdmin(req: Request, res: Response): Promise<void> {
    try {
      // 자기 자신은 삭제 불가
      if (req.params.id === req.admin!._id.toString()) {
        res.status(400).json({ success: false, message: "자기 자신은 삭제할 수 없습니다" });
        return;
      }
      const result = await adminService.deleteAdmin(req.params.id);
      if (!result) {
        res.status(404).json({ success: false, message: "관리자를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, message: "관리자가 삭제되었습니다" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "관리자 삭제 실패";
      res.status(500).json({ success: false, message });
    }
  }

  // ===== 대시보드 =====

  async getDashboard(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "대시보드 조회 실패";
      res.status(500).json({ success: false, message });
    }
  }

  // ===== 사용자 관리 =====

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const result = await adminService.getUsers(req.query as Record<string, unknown>);
      res.json({ success: true, ...result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 목록 조회 실패";
      res.status(500).json({ success: false, message });
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const user = await adminService.getUserById(req.params.id);
      if (!user) {
        res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, data: user });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 조회 실패";
      res.status(500).json({ success: false, message });
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await adminService.updateUser(req.params.id, req.body);
      if (!user) {
        res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, data: user, message: "사용자가 수정되었습니다" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 수정 실패";
      res.status(400).json({ success: false, message });
    }
  }

  async banUser(req: Request, res: Response): Promise<void> {
    try {
      const { reason } = req.body;
      if (!reason) {
        res.status(400).json({ success: false, message: "정지 사유를 입력해주세요" });
        return;
      }
      const user = await adminService.banUser(req.params.id, reason);
      if (!user) {
        res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, data: user, message: "사용자가 정지되었습니다" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 정지 실패";
      res.status(500).json({ success: false, message });
    }
  }

  async unbanUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await adminService.unbanUser(req.params.id);
      if (!user) {
        res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, data: user, message: "정지가 해제되었습니다" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "정지 해제 실패";
      res.status(500).json({ success: false, message });
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await adminService.deleteUser(req.params.id);
      if (!user) {
        res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, data: user, message: "사용자가 삭제되었습니다" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 삭제 실패";
      res.status(500).json({ success: false, message });
    }
  }

  // ===== 편지/사연 관리 =====

  async getLetters(req: Request, res: Response): Promise<void> {
    try {
      const result = await adminService.getLetters(req.query as Record<string, unknown>);
      res.json({ success: true, ...result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "편지 목록 조회 실패";
      res.status(500).json({ success: false, message });
    }
  }

  async getLetterById(req: Request, res: Response): Promise<void> {
    try {
      const letter = await adminService.getLetterById(req.params.id);
      if (!letter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, data: letter });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "편지 조회 실패";
      res.status(500).json({ success: false, message });
    }
  }

  async updateLetter(req: Request, res: Response): Promise<void> {
    try {
      const letter = await adminService.updateLetter(req.params.id, req.body);
      if (!letter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, data: letter, message: "편지가 수정되었습니다" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "편지 수정 실패";
      res.status(400).json({ success: false, message });
    }
  }

  async updateLetterStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status, reason } = req.body;
      if (!status) {
        res.status(400).json({ success: false, message: "상태를 입력해주세요" });
        return;
      }
      const letter = await adminService.updateLetterStatus(req.params.id, status, reason);
      if (!letter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, data: letter, message: "상태가 변경되었습니다" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "상태 변경 실패";
      res.status(400).json({ success: false, message });
    }
  }

  async deleteLetter(req: Request, res: Response): Promise<void> {
    try {
      const letter = await adminService.deleteLetter(req.params.id);
      if (!letter) {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다" });
        return;
      }
      res.json({ success: true, message: "편지가 삭제되었습니다" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "편지 삭제 실패";
      res.status(500).json({ success: false, message });
    }
  }
}

export default new AdminController();
