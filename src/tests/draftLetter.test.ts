import request from "supertest";
import app from "../app";
import DraftLetter from "../models/DraftLetter";
import { connectDB, disconnectDB } from "../config/database";

// Mock user for testing
const mockUser = {
  userId: "507f1f77bcf86cd799439011",
  name: "테스트 사용자",
};

// Mock authentication middleware
jest.mock("../middleware/auth", () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = mockUser;
    next();
  },
}));

describe("Draft Letter API", () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up test data
    await DraftLetter.deleteMany({});
  });

  describe("POST /api/drafts", () => {
    it("새로운 임시저장을 생성해야 함", async () => {
      const draftData = {
        title: "테스트 편지",
        content: "이것은 테스트 편지 내용입니다.",
        type: "friend",
        category: "테스트",
      };

      const response = await request(app).post("/api/drafts").send(draftData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(draftData.title);
      expect(response.body.data.content).toBe(draftData.content);
      expect(response.body.data.saveCount).toBe(1);
      expect(response.body.message).toBe("임시저장되었습니다.");
    });

    it("제목 없이도 임시저장을 생성해야 함 (자동 제목 생성)", async () => {
      const draftData = {
        content: "제목이 없는 편지 내용입니다. 이 내용으로 자동 제목이 생성되어야 합니다.",
        type: "story",
      };

      const response = await request(app).post("/api/drafts").send(draftData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("");
      expect(response.body.data.autoTitle).toContain("제목이 없는 편지 내용입니다");
      expect(response.body.data.wordCount).toBeGreaterThan(0);
    });

    it("수신자 주소와 함께 임시저장을 생성해야 함", async () => {
      const draftData = {
        title: "수신자가 있는 편지",
        content: "수신자 주소가 포함된 편지입니다.",
        type: "friend",
        recipientAddresses: [
          {
            name: "홍길동",
            phone: "010-1234-5678",
            zipCode: "12345",
            address1: "서울시 강남구",
            address2: "101호",
            memo: "테스트 메모",
          },
        ],
      };

      const response = await request(app).post("/api/drafts").send(draftData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(draftData.title);
    });
  });

  describe("GET /api/drafts", () => {
    beforeEach(async () => {
      // Create test drafts
      await DraftLetter.create([
        {
          authorId: mockUser.userId,
          title: "첫 번째 임시저장",
          content: "첫 번째 내용",
          type: "friend",
          category: "테스트",
        },
        {
          authorId: mockUser.userId,
          title: "두 번째 임시저장",
          content: "두 번째 내용",
          type: "story",
          category: "테스트",
        },
      ]);
    });

    it("임시저장 목록을 조회해야 함", async () => {
      const response = await request(app).get("/api/drafts").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.drafts).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
      expect(response.body.data.stats.totalDrafts).toBe(2);
    });

    it("페이지네이션이 작동해야 함", async () => {
      const response = await request(app).get("/api/drafts?page=1&limit=1").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.drafts).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    it("타입별 필터링이 작동해야 함", async () => {
      const response = await request(app).get("/api/drafts?type=friend").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.drafts).toHaveLength(1);
      expect(response.body.data.drafts[0].type).toBe("friend");
    });
  });

  describe("GET /api/drafts/:draftId", () => {
    let testDraft: any;

    beforeEach(async () => {
      testDraft = await DraftLetter.create({
        authorId: mockUser.userId,
        title: "상세 조회 테스트",
        content: "상세 조회용 편지 내용입니다.",
        type: "friend",
        category: "테스트",
      });
    });

    it("임시저장 상세 정보를 조회해야 함", async () => {
      const response = await request(app).get(`/api/drafts/${testDraft._id}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("상세 조회 테스트");
      expect(response.body.data.content).toBe("상세 조회용 편지 내용입니다.");
    });

    it("존재하지 않는 임시저장 조회 시 404 에러", async () => {
      const fakeId = "507f1f77bcf86cd799439012";
      const response = await request(app).get(`/api/drafts/${fakeId}`).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("찾을 수 없습니다");
    });
  });

  describe("PUT /api/drafts/:draftId", () => {
    let testDraft: any;

    beforeEach(async () => {
      testDraft = await DraftLetter.create({
        authorId: mockUser.userId,
        title: "수정 전 제목",
        content: "수정 전 내용",
        type: "friend",
        category: "테스트",
      });
    });

    it("임시저장을 수정해야 함", async () => {
      const updateData = {
        title: "수정된 제목",
        content: "수정된 내용",
        category: "수정된 카테고리",
      };

      const response = await request(app).put(`/api/drafts/${testDraft._id}`).send(updateData).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("수정된 제목");
      expect(response.body.data.saveCount).toBe(2); // 저장 횟수 증가
      expect(response.body.message).toBe("임시저장이 업데이트되었습니다.");
    });
  });

  describe("DELETE /api/drafts/:draftId", () => {
    let testDraft: any;

    beforeEach(async () => {
      testDraft = await DraftLetter.create({
        authorId: mockUser.userId,
        title: "삭제 테스트",
        content: "삭제될 편지 내용",
        type: "friend",
        category: "테스트",
      });
    });

    it("임시저장을 삭제해야 함", async () => {
      const response = await request(app).delete(`/api/drafts/${testDraft._id}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("임시저장된 편지가 삭제되었습니다.");

      // 실제로 삭제되었는지 확인 (소프트 삭제)
      const deletedDraft = await DraftLetter.findById(testDraft._id);
      expect(deletedDraft?.status).toBe("deleted");
    });
  });

  describe("POST /api/drafts/:draftId/publish", () => {
    let testDraft: any;

    beforeEach(async () => {
      testDraft = await DraftLetter.create({
        authorId: mockUser.userId,
        title: "발행할 편지",
        content: "발행될 편지 내용입니다.",
        type: "friend",
        category: "테스트",
      });
    });

    it("임시저장을 정식 편지로 발행해야 함", async () => {
      const publishData = {
        title: "발행된 편지 제목",
      };

      const response = await request(app).post(`/api/drafts/${testDraft._id}/publish`).send(publishData).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.letterId).toBeDefined();
      expect(response.body.data.url).toBeDefined();
      expect(response.body.message).toBe("편지가 성공적으로 발행되었습니다.");

      // 임시저장 상태가 published로 변경되었는지 확인
      const publishedDraft = await DraftLetter.findById(testDraft._id);
      expect(publishedDraft?.status).toBe("published");
      expect(publishedDraft?.publishedAt).toBeDefined();
      expect(publishedDraft?.publishedLetterId).toBeDefined();
    });

    it("제목이 없는 임시저장도 자동 제목으로 발행해야 함", async () => {
      // 제목 없는 임시저장 생성
      const draftWithoutTitle = await DraftLetter.create({
        authorId: mockUser.userId,
        title: "",
        content: "자동 제목으로 발행될 내용입니다.",
        type: "friend",
        category: "테스트",
      });

      const response = await request(app).post(`/api/drafts/${draftWithoutTitle._id}/publish`).send({}).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.letterId).toBeDefined();
    });
  });

  describe("GET /api/drafts/stats", () => {
    beforeEach(async () => {
      // Create test drafts with different word counts
      await DraftLetter.create([
        {
          authorId: mockUser.userId,
          title: "통계 테스트 1",
          content: "짧은 내용",
          type: "friend",
        },
        {
          authorId: mockUser.userId,
          title: "통계 테스트 2",
          content: "조금 더 긴 내용입니다. 단어 수가 더 많습니다.",
          type: "story",
        },
      ]);
    });

    it("임시저장 통계를 조회해야 함", async () => {
      const response = await request(app).get("/api/drafts/stats").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalDrafts).toBe(2);
      expect(response.body.data.totalWords).toBeGreaterThan(0);
      expect(response.body.data.oldestDraft).toBeDefined();
      expect(response.body.data.recentActivity).toBeDefined();
    });
  });

  describe("POST /api/drafts/cleanup", () => {
    it("오래된 임시저장을 정리해야 함", async () => {
      // Create an old draft (31 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      await DraftLetter.create({
        authorId: mockUser.userId,
        title: "오래된 임시저장",
        content: "31일 전 임시저장",
        type: "friend",
        lastSavedAt: oldDate,
        createdAt: oldDate,
      });

      const response = await request(app).post("/api/drafts/cleanup").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cleanedCount).toBe(1);
      expect(response.body.message).toContain("정리되었습니다");
    });
  });

  describe("Validation Tests", () => {
    it("잘못된 타입으로 임시저장 생성 시 400 에러", async () => {
      const invalidData = {
        title: "테스트",
        content: "내용",
        type: "invalid_type", // 잘못된 타입
      };

      const response = await request(app).post("/api/drafts").send(invalidData).expect(400);

      expect(response.body.success).toBe(false);
    });

    it("너무 긴 제목으로 임시저장 생성 시 400 에러", async () => {
      const invalidData = {
        title: "a".repeat(201), // 200자 초과
        content: "내용",
        type: "friend",
      };

      const response = await request(app).post("/api/drafts").send(invalidData).expect(400);

      expect(response.body.success).toBe(false);
    });

    it("너무 긴 내용으로 임시저장 생성 시 400 에러", async () => {
      const invalidData = {
        title: "제목",
        content: "a".repeat(10001), // 10,000자 초과
        type: "friend",
      };

      const response = await request(app).post("/api/drafts").send(invalidData).expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
