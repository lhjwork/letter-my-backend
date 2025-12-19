import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

// Admin 역할
export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MANAGER = "manager",
}

// Admin 상태
export enum AdminStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

// 권한 목록
export const PERMISSIONS = {
  USERS_READ: "users.read",
  USERS_WRITE: "users.write",
  USERS_DELETE: "users.delete",
  LETTERS_READ: "letters.read",
  LETTERS_WRITE: "letters.write",
  LETTERS_DELETE: "letters.delete",
  ADMINS_READ: "admins.read",
  ADMINS_WRITE: "admins.write",
  ADMINS_DELETE: "admins.delete",
  DASHBOARD_READ: "dashboard.read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// 역할별 기본 권한
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  [AdminRole.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [AdminRole.ADMIN]: [PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE, PERMISSIONS.LETTERS_READ, PERMISSIONS.LETTERS_WRITE, PERMISSIONS.LETTERS_DELETE, PERMISSIONS.DASHBOARD_READ],
  [AdminRole.MANAGER]: [PERMISSIONS.USERS_READ, PERMISSIONS.LETTERS_READ, PERMISSIONS.DASHBOARD_READ],
};

export interface IAdmin extends Document {
  username: string;
  password: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
  department?: string;
  status: AdminStatus;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasPermission(permission: Permission): boolean;
}

interface IAdminModel extends Model<IAdmin> {
  findByUsername(username: string): Promise<IAdmin | null>;
}

const AdminSchema = new Schema<IAdmin, IAdminModel>(
  {
    username: {
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
      transform: function (_doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// 비밀번호 해싱 (저장 전)
AdminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// 비밀번호 비교 메서드
AdminSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// 권한 확인 메서드
AdminSchema.methods.hasPermission = function (permission: Permission): boolean {
  const admin = this as IAdmin;
  if (admin.role === AdminRole.SUPER_ADMIN) return true;
  const rolePermissions = ROLE_PERMISSIONS[admin.role];
  return rolePermissions.includes(permission) || admin.permissions.includes(permission);
};

// Static 메서드
AdminSchema.statics.findByUsername = function (username: string): Promise<IAdmin | null> {
  return this.findOne({ username });
};

const Admin = mongoose.model<IAdmin, IAdminModel>("Admin", AdminSchema);

export default Admin;
