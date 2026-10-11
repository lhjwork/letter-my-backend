/**
 * 주소록: 배송지명·연락처 선택, 형식 검증은 유지. DB 없이 validator 와 모델 validateSync 로만 확인.
 * 실행: npx ts-node-dev --transpile-only src/tests/addressBook.test.ts
 */
import assert from "node:assert/strict";
import { validationResult } from "express-validator";
import { createAddressValidation } from "../middleware/addressValidation";
import User from "../models/User";

async function errorsFor(body: Record<string, unknown>) {
  const req = { body } as never;
  for (const chain of createAddressValidation) await chain.run(req);
  return validationResult(req).array().map((e) => (e as { path: string }).path);
}

(async () => {
  const base = { recipientName: "엄마", zipCode: "04700", address: "서울 성동구 성수이로 00", addressDetail: "000동 000호" };

  // 배송지명·연락처 없이 통과
  assert.deepEqual(await errorsFor(base), []);
  assert.deepEqual(await errorsFor({ ...base, phone: "" }), []);
  assert.deepEqual(await errorsFor({ ...base, phone: "010-1234-5678" }), []);

  // 형식·필수는 그대로
  assert.deepEqual(await errorsFor({ ...base, phone: "공일공" }), ["phone"]);
  assert.deepEqual(await errorsFor({ ...base, recipientName: "" }), ["recipientName"]);
  assert.deepEqual(await errorsFor({ ...base, addressName: "가".repeat(21) }), ["addressName"]);

  // 모델: 연락처 없는 주소도 저장 가능
  const u = new User({ email: "a@b.c", name: "n", addresses: [{ ...base, addressName: "엄마" }] });
  assert.equal(u.validateSync()?.errors["addresses.0.phone"], undefined);

  // 수정은 서브문서에 대입 → _id 유지
  const id = String(u.addresses[0]._id);
  Object.assign(u.addresses[0], { recipientName: "어머니", phone: undefined });
  assert.equal(String(u.addresses[0]._id), id);
  assert.equal(u.addresses[0].recipientName, "어머니");

  console.log("addressBook.test.ts ok");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
