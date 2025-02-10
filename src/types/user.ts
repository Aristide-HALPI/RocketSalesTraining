export type UserRole = 'admin' | 'trainer' | 'learner';
export type UserStatus = 'active' | 'archived' | 'inactive' | 'suspended';

export interface UserMetadata {
  lastUpdated: string;
  updatedBy: string | null;
  lastLoginAt: string;
  lastActivityAt: string;
  version: number;
}

export interface UserPermissions {
  canManageExercises: boolean;
  canManageUsers: boolean;
}

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
  organizationId: string;
  permissions: UserPermissions;
  metadata?: UserMetadata;
  profilePicture?: string;
  settings?: {
    notifications?: boolean;
    language?: string;
    theme?: 'light' | 'dark';
  };
}

export type UserData = Partial<User>;
