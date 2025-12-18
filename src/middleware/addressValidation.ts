import { body, param, query } from "express-validator";

// 배송지 생성 유효성 검사
export const createAddressValidation = [
  body("addressName").trim().notEmpty().withMessage("배송지명을 입력해주세요.").isLength({ max: 20 }).withMessage("배송지명은 20자 이내로 입력해주세요."),

  body("recipientName").trim().notEmpty().withMessage("수령인을 입력해주세요.").isLength({ max: 50 }).withMessage("수령인은 50자 이내로 입력해주세요."),

  body("zipCode").trim().notEmpty().withMessage("우편번호를 입력해주세요."),

  body("address").trim().notEmpty().withMessage("주소를 입력해주세요."),

  body("addressDetail").optional().trim().isLength({ max: 100 }).withMessage("상세주소는 100자 이내로 입력해주세요."),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("휴대전화를 입력해주세요.")
    .matches(/^[0-9-]+$/)
    .withMessage("올바른 전화번호 형식이 아닙니다."),

  body("tel")
    .optional()
    .trim()
    .matches(/^[0-9-]*$/)
    .withMessage("올바른 전화번호 형식이 아닙니다."),

  body("isDefault").optional().isBoolean().withMessage("isDefault는 boolean 값이어야 합니다."),
];

// 배송지 수정 유효성 검사
export const updateAddressValidation = [param("id").isMongoId().withMessage("유효하지 않은 배송지 ID입니다."), ...createAddressValidation];

// 배송지 ID 파라미터 유효성 검사
export const addressIdValidation = [param("id").isMongoId().withMessage("유효하지 않은 배송지 ID입니다.")];

// 최근 배송지 조회 유효성 검사
export const recentAddressQueryValidation = [query("limit").optional().isInt({ min: 1, max: 20 }).withMessage("limit은 1~20 사이의 숫자여야 합니다.")];

// 주소록 저장 유효성 검사
export const saveToAddressBookValidation = [
  param("id").isMongoId().withMessage("유효하지 않은 배송지 ID입니다."),
  body("addressName").optional().trim().isLength({ max: 20 }).withMessage("배송지명은 20자 이내로 입력해주세요."),
];
