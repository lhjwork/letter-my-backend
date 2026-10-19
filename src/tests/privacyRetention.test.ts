/**
 * 보유 기간 정리 조건. DB 없이 실행.
 * 실행: npx ts-node-dev --transpile-only src/tests/privacyRetention.test.ts
 */
import assert from "node:assert/strict";
import { cutoffFrom, expiredAddress, expiredInquiry, purgeAddressUpdate, PURGED } from "../jobs/privacyRetention";

const now = new Date("2026-10-20T00:00:00Z");
const cutoff = cutoffFrom(now);
assert.equal(cutoff.toISOString(), "2025-10-20T00:00:00.000Z");

const a = expiredAddress(cutoff);
// 진행 중(requested·approved·writing)과 주소록(none)은 지우지 않는다
assert.deepEqual(a.physicalStatus.$in, ["rejected", "sent", "delivered"]);
assert.equal(a.physicalRequestDate.$lt, cutoff);
assert.equal(a.address1.$ne, PURGED);

// 이름·연락처·주소·메모를 모두 비우고 접속 정보도 지운다
const set = purgeAddressUpdate.$set;
for (const k of ["name", "phone", "zipCode", "address1", "address2", "memo"]) assert.ok(`recipientAddresses.$[r].${k}` in set, k);
for (const k of ["sessionId", "userAgent", "ipAddress"]) assert.ok(`recipientAddresses.$[r].${k}` in purgeAddressUpdate.$unset, k);

// 답변 안 한 문의는 남긴다
assert.deepEqual(expiredInquiry(cutoff), { status: "answered", answeredAt: { $lt: cutoff } });
console.log("privacyRetention.test.ts ok");
