export type UserRole = 'admin' | 'formateur' | 'apprenant';
export type UserStatus = 'actif' | 'inactif' | 'suspendu';

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
