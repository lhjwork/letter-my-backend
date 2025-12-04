import Test, { ITest } from "../models/Test";

// Test Service 클래스
export class TestService {
  // 모든 테스트 조회
  async findAll(page: number = 1, limit: number = 10): Promise<{ tests: ITest[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [tests, total] = await Promise.all([Test.find().skip(skip).limit(limit).sort({ createdAt: -1 }), Test.countDocuments()]);

    return {
      tests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ID로 테스트 조회
  async findById(testId: string): Promise<ITest | null> {
    return Test.findById(testId);
  }

  // 상태로 테스트 조회
  async findByStatus(status: string): Promise<ITest[]> {
    return Test.findByStatus(status);
  }

  // 우선순위로 테스트 조회
  async findByPriority(minPriority: number): Promise<ITest[]> {
    return Test.findByPriority(minPriority);
  }

  // 생성자로 테스트 조회
  async findByCreator(createdBy: string): Promise<ITest[]> {
    return Test.find({ createdBy }).sort({ createdAt: -1 });
  }

  // 테스트 생성
  async createTest(data: { title: string; description: string; priority?: number; createdBy: string; status?: "pending" | "in-progress" | "completed" }): Promise<ITest> {
    // 제목 중복 체크 (같은 사용자가 같은 제목으로 생성 방지)
    const existingTest = await Test.findOne({
      title: data.title,
      createdBy: data.createdBy,
    });

    if (existingTest) {
      throw new Error("You already have a test with this title");
    }

    const test = new Test({
      title: data.title,
      description: data.description,
      priority: data.priority || 3,
      status: data.status || "pending",
      createdBy: data.createdBy,
    });

    return test.save();
  }

  // 테스트 업데이트
  async updateTest(testId: string, data: { title?: string; description?: string; status?: string; priority?: number }): Promise<ITest | null> {
    const test = await Test.findByIdAndUpdate(testId, { $set: data }, { new: true, runValidators: true });

    return test;
  }

  // 테스트 상태 변경
  async changeStatus(testId: string, newStatus: "pending" | "in-progress" | "completed"): Promise<ITest | null> {
    const test = await Test.findById(testId);

    if (!test) {
      throw new Error("Test not found");
    }

    // 비즈니스 로직: completed -> pending 불가
    if (test.status === "completed" && newStatus === "pending") {
      throw new Error("Cannot change completed test back to pending");
    }

    test.status = newStatus;
    return test.save();
  }

  // 테스트 삭제
  async deleteTest(testId: string): Promise<boolean> {
    const result = await Test.findByIdAndDelete(testId);
    return !!result;
  }

  // 통계 조회
  async getStatistics(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    highPriority: number;
  }> {
    const [total, pending, inProgress, completed, highPriority] = await Promise.all([
      Test.countDocuments(),
      Test.countDocuments({ status: "pending" }),
      Test.countDocuments({ status: "in-progress" }),
      Test.countDocuments({ status: "completed" }),
      Test.countDocuments({ priority: { $gte: 4 } }),
    ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      highPriority,
    };
  }

  // 생성자별 통계
  async getStatisticsByCreator(createdBy: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  }> {
    const [total, pending, inProgress, completed] = await Promise.all([
      Test.countDocuments({ createdBy }),
      Test.countDocuments({ createdBy, status: "pending" }),
      Test.countDocuments({ createdBy, status: "in-progress" }),
      Test.countDocuments({ createdBy, status: "completed" }),
    ]);

    return {
      total,
      pending,
      inProgress,
      completed,
    };
  }
}

// Service 인스턴스 생성 및 내보내기
export default new TestService();
