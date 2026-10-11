/**
 * 신청 상태 페이지의 이름·주소 가리기. DB 없이 실행.
 * 실행: npx ts-node-dev --transpile-only src/tests/mask.test.ts
 */
import assert from "node:assert/strict";
import { maskAddress, maskName } from "../services/recipientLetterService";

assert.equal(maskName("김하늘"), "김*늘");
assert.equal(maskName("김하"), "김*");
assert.equal(maskName("남궁하늘"), "남**늘");
assert.equal(maskName("김"), "김");
assert.equal(maskName(""), "");
assert.equal(maskAddress("서울 성동구 성수이로 1"), "서울 성동구");
assert.equal(maskAddress("  부산광역시   해운대구 해운대로 000 "), "부산광역시 해운대구");
assert.equal(maskAddress(""), "");
console.log("mask.test.ts ok");
