import cron from "node-cron";
import draftLetterService from "../services/draftLetterService";

/**
 * 오래된 임시저장 정리 크론 작업
 * 매일 새벽 2시에 30일 이상 된 임시저장을 정리합니다.
 */
export const setupDraftCleanupJob = () => {
  // 매일 새벽 2시에 실행 (0 2 * * *)
  cron.schedule("0 2 * * *", async () => {
    try {
      console.log("🧹 [CRON] Starting draft cleanup job...");

      const cleanedCount = await draftLetterService.cleanupOldDrafts();

      console.log(`✅ [CRON] Draft cleanup completed. Cleaned ${cleanedCount} old drafts.`);

      // 로그를 위한 추가 정보
      if (cleanedCount > 0) {
        console.log(`📊 [CRON] Cleanup summary: ${cleanedCount} drafts older than 30 days were marked as deleted.`);
      } else {
        console.log("📊 [CRON] No old drafts found to cleanup.");
      }
    } catch (error) {
      console.error("❌ [CRON] Draft cleanup job failed:", error);

      // 에러 발생 시 알림 또는 로깅 시스템에 전송
      // 예: Slack, Discord, 이메일 등
      // await notifyError("Draft cleanup job failed", error);
    }
  });

  console.log("⏰ [CRON] Draft cleanup job scheduled to run daily at 2:00 AM");
};

/**
 * 수동으로 정리 작업 실행 (테스트용)
 */
export const runDraftCleanupNow = async () => {
  try {
    console.log("🧹 [MANUAL] Starting manual draft cleanup...");

    const cleanedCount = await draftLetterService.cleanupOldDrafts();

    console.log(`✅ [MANUAL] Manual draft cleanup completed. Cleaned ${cleanedCount} old drafts.`);

    return cleanedCount;
  } catch (error) {
    console.error("❌ [MANUAL] Manual draft cleanup failed:", error);
    throw error;
  }
};

/**
 * 크론 작업 상태 확인
 */
export const getDraftCleanupJobStatus = () => {
  const tasks = cron.getTasks();

  return {
    isScheduled: tasks.size > 0,
    pattern: "0 2 * * *", // 매일 새벽 2시
    description: "Daily cleanup of drafts older than 30 days",
    nextRun: tasks.size > 0 ? "Next run at 2:00 AM" : "Not scheduled",
  };
};
