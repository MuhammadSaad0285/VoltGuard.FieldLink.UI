export interface AdminUserListItem {
  id: string;
  fullName?: string;
  userName?: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAtUtc?: string;
  lastLoginAtUtc?: string | null;
}

export interface AdminUserDetails extends AdminUserListItem {
  updatedAtUtc?: string;
}

export interface AdminUserSearchParams {
  searchTerm?: string;
  role?: string;
  isActive?: boolean | null;
  pageNumber: number;
  pageSize: number;
}

export interface AdminUserCreateRequest {
  fullName: string;
  email: string;
  password: string;
  roles: string[];
  isActive: boolean;
}

export interface AdminUserUpdateRequest {
  fullName: string;
  email: string;
  roles: string[];
  isActive: boolean;
}

export interface AdminUserResetPasswordRequest {
  newPassword: string;
}
