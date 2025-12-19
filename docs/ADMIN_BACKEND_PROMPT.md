# Admin 백엔드 구현 프롬프트

## 개요

Letter My 서비스의 관리자(Admin) 백엔드 API를 구현합니다.
Admin은 일반 User와 완전히 분리된 별도 모델로 관리하며, 이메일/비밀번호 로그인을 사용합니다.

---

## 1. Admin 모델

### 파일: `src/models/Admin.ts`

```typescript
import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

// Admin 역할
export enum AdminRole {
  SUPER_ADMIN = "super_admin", // 최고 관리자 (관리자 관리 가능)
  ADMIN = "admin",             // 일반 관리자
  MANAGER = "manager",         // 매니저 (조회 위주)
}

// Admin 상태
export enum AdminStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

// 권한 목록
export const PERMISSIONS = {
  // 사용자 관리
  USERS_READ: "users.read",
  USERS_WRITE: "users.write",
  USERS_DELETE: "users.delete",
```

// 편지/사연 관리
LETTERS_READ: "letters.read",
LETTERS_WRITE: "letters.write",
LETTERS_DELETE: "letters.delete",

// 관리자 관리 (super_admin 전용)
ADMINS_READ: "admins.read",
ADMINS_WRITE: "admins.write",
ADMINS_DELETE: "admins.delete",

// 대시보드
DASHBOARD_READ: "dashboard.read",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// 역할별 기본 권한
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
[AdminRole.SUPER_ADMIN]: Object.values(PERMISSIONS),
[AdminRole.ADMIN]: [
PERMISSIONS.USERS_READ,
PERMISSIONS.USERS_WRITE,
PERMISSIONS.LETTERS_READ,
PERMISSIONS.LETTERS_WRITE,
PERMISSIONS.LETTERS_DELETE,
PERMISSIONS.DASHBOARD_READ,
],
[AdminRole.MANAGER]: [
PERMISSIONS.USERS_READ,
PERMISSIONS.LETTERS_READ,
PERMISSIONS.DASHBOARD_READ,
],
};

export interface IAdmin extends Document {
email: string;
password: string;
name: string;
role: AdminRole;
permissions: Permission[];
department?: string;
status: AdminStatus;
lastLoginAt?: Date;
createdAt: Date;
updatedAt: Date;

// 메서드
comparePassword(candidatePassword: string): Promise<boolean>;
hasPermission(permission: Permission): boolean;
}

interface IAdminModel extends Model<IAdmin> {
findByEmail(email: string): Promise<IAdmin | null>;
}

const AdminSchema = new Schema<IAdmin, IAdminModel>(
{
email: {
type: String,
required: true,
unique: true,
lowercase: true,
trim: true,
index: true,
},
password: {
type: String,
required: true,
minlength: 8,
},
name: {
type: String,
required: true,
trim: true,
},
role: {
type: String,
enum: Object.values(AdminRole),
default: AdminRole.MANAGER,
},
permissions: {
type: [String],
default: [],
},
department: {
type: String,
trim: true,
},
status: {
type: String,
enum: Object.values(AdminStatus),
default: AdminStatus.ACTIVE,
},
lastLoginAt: Date,
},
{
timestamps: true,
toJSON: {
transform: function (\_doc, ret) {
delete ret.password;
delete ret.\_\_v;
return ret;
},
},
}
);

// 비밀번호 해싱 (저장 전)
AdminSchema.pre("save", async function (next) {
if (!this.isModified("password")) return next();

const salt = await bcrypt.genSalt(12);
this.password = await bcrypt.hash(this.password, salt);
next();
});

// 비밀번호 비교 메서드
AdminSchema.methods.comparePassword = async function (
candidatePassword: string
): Promise<boolean> {
return bcrypt.compare(candidatePassword, this.password);
};

// 권한 확인 메서드
AdminSchema.methods.hasPermission = function (permission: Permission): boolean {
const admin = this as IAdmin;

// super_admin은 모든 권한
if (admin.role === AdminRole.SUPER_ADMIN) return true;

// 역할 기본 권한 + 추가 권한 확인
const rolePermissions = ROLE_PERMISSIONS[admin.role];
return rolePermissions.includes(permission) || admin.permissions.includes(permission);
};

// Static 메서드
AdminSchema.statics.findByEmail = function (email: string): Promise<IAdmin | null> {
return this.findOne({ email });
};

const Admin = mongoose.model<IAdmin, IAdminModel>("Admin", AdminSchema);

export default Admin;

````

---

## 2. 필요한 패키지

```bash
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
````

---

## 3. Admin 인증 미들웨어

### 파일: `src/middleware/adminAuth.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Admin, { IAdmin, Permission, AdminStatus } from "../models/Admin";

// Request에 admin 정보 추가
declare global {
  namespace Express {
    interface Request {
      admin?: IAdmin;
    }
  }
}

// Admin 인증 미들웨어
export const adminAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "인증 토큰이 필요합니다" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      adminId: string;
      type: string;
    };

    if (decoded.type !== "admin") {
      res.status(401).json({ success: false, message: "유효하지 않은 토큰입니다" });
      return;
    }

    const admin = await Admin.findById(decoded.adminId);

    if (!admin || admin.status !== AdminStatus.ACTIVE) {
      res.status(401).json({ success: false, message: "비활성화된 계정입니다" });
      return;
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "인증에 실패했습니다" });
  }
};

// 권한 확인 미들웨어
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ success: false, message: "인증이 필요합니다" });
      return;
    }

    if (!req.admin.hasPermission(permission)) {
      res.status(403).json({ success: false, message: "권한이 없습니다" });
      return;
    }

    next();
  };
};

// Super Admin 전용 미들웨어
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.admin) {
    res.status(401).json({ success: false, message: "인증이 필요합니다" });
    return;
  }

  if (req.admin.role !== "super_admin") {
    res.status(403).json({ success: false, message: "최고 관리자 권한이 필요합니다" });
    return;
  }

  next();
};
```

---

## 4. API 엔드포인트

### 인증 API

| Method | Endpoint                   | 설명          | 권한   |
| ------ | -------------------------- | ------------- | ------ |
| POST   | `/api/admin/auth/login`    | 로그인        | Public |
| POST   | `/api/admin/auth/logout`   | 로그아웃      | Admin  |
| GET    | `/api/admin/auth/me`       | 내 정보 조회  | Admin  |
| PUT    | `/api/admin/auth/password` | 비밀번호 변경 | Admin  |

### 관리자 관리 API (Super Admin 전용)

| Method | Endpoint                | 설명        |
| ------ | ----------------------- | ----------- |
| GET    | `/api/admin/admins`     | 관리자 목록 |
| POST   | `/api/admin/admins`     | 관리자 생성 |
| GET    | `/api/admin/admins/:id` | 관리자 상세 |
| PUT    | `/api/admin/admins/:id` | 관리자 수정 |
| DELETE | `/api/admin/admins/:id` | 관리자 삭제 |

### 대시보드 API

| Method | Endpoint               | 설명          | 권한           |
| ------ | ---------------------- | ------------- | -------------- |
| GET    | `/api/admin/dashboard` | 대시보드 통계 | dashboard.read |

### 사용자 관리 API

| Method | Endpoint                     | 설명        | 권한         |
| ------ | ---------------------------- | ----------- | ------------ |
| GET    | `/api/admin/users`           | 사용자 목록 | users.read   |
| GET    | `/api/admin/users/:id`       | 사용자 상세 | users.read   |
| PUT    | `/api/admin/users/:id`       | 사용자 수정 | users.write  |
| POST   | `/api/admin/users/:id/ban`   | 사용자 정지 | users.write  |
| POST   | `/api/admin/users/:id/unban` | 정지 해제   | users.write  |
| DELETE | `/api/admin/users/:id`       | 사용자 삭제 | users.delete |

### 편지/사연 관리 API

| Method | Endpoint                        | 설명      | 권한           |
| ------ | ------------------------------- | --------- | -------------- |
| GET    | `/api/admin/letters`            | 편지 목록 | letters.read   |
| GET    | `/api/admin/letters/:id`        | 편지 상세 | letters.read   |
| PUT    | `/api/admin/letters/:id`        | 편지 수정 | letters.write  |
| PUT    | `/api/admin/letters/:id/status` | 상태 변경 | letters.write  |
| DELETE | `/api/admin/letters/:id`        | 편지 삭제 | letters.delete |

---

## 5. Admin 인증 서비스

### 파일: `src/services/adminAuthService.ts`

```typescript
import jwt from "jsonwebtoken";
import Admin, { IAdmin, AdminStatus } from "../models/Admin";

class AdminAuthService {
  // 로그인
  async login(email: string, password: string): Promise<{ admin: IAdmin; token: string }> {
    const admin = await Admin.findByEmail(email);

    if (!admin) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다");
    }

    if (admin.status !== AdminStatus.ACTIVE) {
      throw new Error("비활성화된 계정입니다");
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다");
    }

    // 마지막 로그인 시간 업데이트
    admin.lastLoginAt = new Date();
    await admin.save();

    // JWT 토큰 생성
    const token = jwt.sign({ adminId: admin._id, type: "admin" }, process.env.JWT_SECRET!, { expiresIn: "8h" });

    return { admin, token };
  }

  // 비밀번호 변경
  async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<void> {
    const admin = await Admin.findById(adminId);

    if (!admin) {
      throw new Error("관리자를 찾을 수 없습니다");
    }

    const isMatch = await admin.comparePassword(currentPassword);

    if (!isMatch) {
      throw new Error("현재 비밀번호가 올바르지 않습니다");
    }

    admin.password = newPassword;
    await admin.save();
  }
}

export default new AdminAuthService();
```

---

## 6. Admin 관리 서비스

### 파일: `src/services/adminService.ts`

```typescript
import Admin, { IAdmin, AdminRole, AdminStatus, Permission, ROLE_PERMISSIONS } from "../models/Admin";

interface AdminQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminRole;
  status?: AdminStatus;
  department?: string;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class AdminService {
  // 관리자 목록 조회
  async getAdmins(params: AdminQueryParams): Promise<PaginatedResult<IAdmin>> {
    const { page = 1, limit = 20, search, role, status, department } = params;

    const query: any = {};

    if (search) {
      query.$or = [{ email: { $regex: search, $options: "i" } }, { name: { $regex: search, $options: "i" } }];
    }
    if (role) query.role = role;
    if (status) query.status = status;
    if (department) query.department = department;

    const total = await Admin.countDocuments(query);
    const admins = await Admin.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      data: admins,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 관리자 생성
  async createAdmin(data: { email: string; password: string; name: string; role?: AdminRole; permissions?: Permission[]; department?: string }): Promise<IAdmin> {
    const existing = await Admin.findByEmail(data.email);

    if (existing) {
      throw new Error("이미 존재하는 이메일입니다");
    }

    const admin = new Admin({
      ...data,
      role: data.role || AdminRole.MANAGER,
      permissions: data.permissions || [],
    });

    return admin.save();
  }

  // 관리자 상세 조회
  async getAdminById(id: string): Promise<IAdmin | null> {
    return Admin.findById(id);
  }

  // 관리자 수정
  async updateAdmin(
    id: string,
    data: Partial<{
      name: string;
      role: AdminRole;
      permissions: Permission[];
      department: string;
      status: AdminStatus;
    }>
  ): Promise<IAdmin | null> {
    return Admin.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  // 관리자 삭제
  async deleteAdmin(id: string): Promise<boolean> {
    const result = await Admin.findByIdAndDelete(id);
    return !!result;
  }

  // 역할별 기본 권한 조회
  getRolePermissions(role: AdminRole): Permission[] {
    return ROLE_PERMISSIONS[role];
  }
}

export default new AdminService();
```

---

## 7. Admin 라우트

### 파일: `src/routes/adminRoutes.ts`

```typescript
import { Router } from "express";
import { adminAuthenticate, requirePermission, requireSuperAdmin } from "../middleware/adminAuth";
import { PERMISSIONS } from "../models/Admin";
import adminAuthController from "../controllers/adminAuthController";
import adminController from "../controllers/adminController";

const router = Router();

// ===== 인증 API =====
router.post("/auth/login", adminAuthController.login);
router.post("/auth/logout", adminAuthenticate, adminAuthController.logout);
router.get("/auth/me", adminAuthenticate, adminAuthController.getMe);
router.put("/auth/password", adminAuthenticate, adminAuthController.changePassword);

// ===== 관리자 관리 (Super Admin 전용) =====
router.get("/admins", adminAuthenticate, requireSuperAdmin, adminController.getAdmins);
router.post("/admins", adminAuthenticate, requireSuperAdmin, adminController.createAdmin);
router.get("/admins/:id", adminAuthenticate, requireSuperAdmin, adminController.getAdminById);
router.put("/admins/:id", adminAuthenticate, requireSuperAdmin, adminController.updateAdmin);
router.delete("/admins/:id", adminAuthenticate, requireSuperAdmin, adminController.deleteAdmin);

// ===== 대시보드 =====
router.get("/dashboard", adminAuthenticate, requirePermission(PERMISSIONS.DASHBOARD_READ), adminController.getDashboard);

// ===== 사용자 관리 =====
router.get("/users", adminAuthenticate, requirePermission(PERMISSIONS.USERS_READ), adminController.getUsers);
router.get("/users/:id", adminAuthenticate, requirePermission(PERMISSIONS.USERS_READ), adminController.getUserById);
router.put("/users/:id", adminAuthenticate, requirePermission(PERMISSIONS.USERS_WRITE), adminController.updateUser);
router.post("/users/:id/ban", adminAuthenticate, requirePermission(PERMISSIONS.USERS_WRITE), adminController.banUser);
router.post("/users/:id/unban", adminAuthenticate, requirePermission(PERMISSIONS.USERS_WRITE), adminController.unbanUser);
router.delete("/users/:id", adminAuthenticate, requirePermission(PERMISSIONS.USERS_DELETE), adminController.deleteUser);

// ===== 편지/사연 관리 =====
router.get("/letters", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_READ), adminController.getLetters);
router.get("/letters/:id", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_READ), adminController.getLetterById);
router.put("/letters/:id", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_WRITE), adminController.updateLetter);
router.put("/letters/:id/status", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_WRITE), adminController.updateLetterStatus);
router.delete("/letters/:id", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_DELETE), adminController.deleteLetter);

export default router;
```

### `src/routes/index.ts`에 등록

```typescript
import adminRoutes from "./adminRoutes";

// Admin routes
router.use("/admin", adminRoutes);
```

---

## 8. User 모델 수정 (상태 관리용)

### `src/models/User.ts`에 추가

```typescript
// User 상태 (Admin에서 관리)
export enum UserStatus {
  ACTIVE = "active",
  BANNED = "banned",
  DELETED = "deleted",
}

// IUser 인터페이스에 추가
interface IUser {
  // 기존 필드...
  status: UserStatus;
  bannedAt?: Date;
  bannedReason?: string;
  deletedAt?: Date;
}

// UserSchema에 추가
status: {
  type: String,
  enum: Object.values(UserStatus),
  default: UserStatus.ACTIVE,
},
bannedAt: Date,
bannedReason: String,
deletedAt: Date,
```

---

## 9. Letter 모델 수정 (상태 관리용)

### `src/models/Letter.ts` 수정

```typescript
// Letter 상태
export enum LetterStatus {
  CREATED = "created",
  PUBLISHED = "published",
  HIDDEN = "hidden", // 관리자에 의해 숨김
  DELETED = "deleted", // 삭제됨
}

// ILetter 인터페이스에 추가
interface ILetter {
  // 기존 필드...
  status: LetterStatus;
  hiddenAt?: Date;
  hiddenReason?: string;
  deletedAt?: Date;
}
```

---

## 10. 초기 Super Admin 생성 스크립트

### 파일: `scripts/createSuperAdmin.ts`

```typescript
import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin, { AdminRole, AdminStatus } from "../src/models/Admin";

dotenv.config();

async function createSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("MongoDB 연결 성공");

    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || "Super Admin";

    if (!email || !password) {
      console.error("Usage: pnpm ts-node scripts/createSuperAdmin.ts <email> <password> [name]");
      process.exit(1);
    }

    if (password.length < 8) {
      console.error("비밀번호는 8자 이상이어야 합니다");
      process.exit(1);
    }

    const existing = await Admin.findByEmail(email);

    if (existing) {
      console.error(`이미 존재하는 이메일입니다: ${email}`);
      process.exit(1);
    }

    const admin = new Admin({
      email,
      password,
      name,
      role: AdminRole.SUPER_ADMIN,
      status: AdminStatus.ACTIVE,
    });

    await admin.save();

    console.log("✅ Super Admin 생성 완료");
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: super_admin`);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
  } finally {
    await mongoose.disconnect();
  }
}

createSuperAdmin();
```

**실행:**

```bash
pnpm ts-node scripts/createSuperAdmin.ts admin@lettermy.com mypassword123 "관리자"
```

---

## 11. package.json 스크립트 추가

```json
{
  "scripts": {
    "admin:create": "ts-node scripts/createSuperAdmin.ts"
  }
}
```

---

## 12. 환경 변수

`.env`에 추가:

```env
# JWT Secret (Admin용, 기존과 동일하게 사용 가능)
JWT_SECRET=your-jwt-secret-key
```

---

## 구현 파일 구조

```
src/
├── models/
│   ├── Admin.ts              # Admin 모델 (NEW)
│   ├── User.ts               # status 필드 추가
│   └── Letter.ts             # status 확장
├── middleware/
│   └── adminAuth.ts          # Admin 인증/권한 미들웨어 (NEW)
├── services/
│   ├── adminAuthService.ts   # Admin 인증 서비스 (NEW)
│   └── adminService.ts       # Admin 관리 서비스 (NEW)
├── controllers/
│   ├── adminAuthController.ts # Admin 인증 컨트롤러 (NEW)
│   └── adminController.ts     # Admin 관리 컨트롤러 (NEW)
└── routes/
    └── adminRoutes.ts         # Admin 라우트 (NEW)

scripts/
└── createSuperAdmin.ts        # Super Admin 생성 스크립트 (NEW)
```

---

## 구현 순서

1. `bcryptjs` 패키지 설치
2. Admin 모델 생성 (`src/models/Admin.ts`)
3. Admin 인증 미들웨어 생성 (`src/middleware/adminAuth.ts`)
4. Admin 인증 서비스 생성 (`src/services/adminAuthService.ts`)
5. Admin 관리 서비스 생성 (`src/services/adminService.ts`)
6. Admin 컨트롤러 생성
7. Admin 라우트 생성 및 등록
8. User 모델에 status 필드 추가
9. Letter 모델에 status 확장
10. Super Admin 생성 스크립트 작성
11. 테스트

---

## 권한 체계 요약

| Role          | 설명        | 권한                         |
| ------------- | ----------- | ---------------------------- |
| `super_admin` | 최고 관리자 | 모든 권한 (관리자 관리 포함) |
| `admin`       | 일반 관리자 | 사용자/편지 관리 (삭제 포함) |
| `manager`     | 매니저      | 조회만 가능                  |

추가 권한이 필요한 경우 `permissions` 배열에 개별 권한을 추가할 수 있습니다.
