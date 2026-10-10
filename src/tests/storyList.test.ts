/**
 * 사연 목록 응답 모양 검증. 실행: npx ts-node-dev --transpile-only src/tests/storyList.test.ts
 * DB 가 있으면 getStories 를 실제로 호출해 카드 필드만 나가는지(본문 전체·좋아요·조회수 없음) 확인하고, 없으면 건너뛴다.
 */
import assert from "node:assert/strict";
import mongoose from "mongoose";
import letterService from "../services/letterService";

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("storyList.test.ts skipped (MONGODB_URI 없음)");
    return;
  }
  await mongoose.connect(uri);
  const { stories, pagination } = await letterService.getStories({ page: 1, limit: 3, sort: "popular" });
  assert.ok(pagination.total >= stories.length);
  for (const s of stories) {
    const o = s as Record<string, unknown>;
    assert.equal(typeof o.replyCount, "number");
    assert.ok(typeof o.preview === "string" && (o.preview as string).length <= 80);
    for (const k of ["content", "plainContent", "likeCount", "viewCount", "userId", "recipientAddresses", "savedBy"]) assert.equal(o[k], undefined, `${k} 는 목록에 나가면 안 된다`);
    if (o.isAnonymous) assert.equal(o.authorName, "익명");
  }
  await mongoose.disconnect();
  console.log("storyList.test.ts ok");
})();
