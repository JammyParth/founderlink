import { UserRole } from './auth.model';

export interface UserProfile {
  userId: number;
  name: string | null;
  email: string;
  role: UserRole;
  skills: string | null;
  experience: string | null;
  bio: string | null;
  portfolioLinks: string | null;
}

export interface UserProfileDto {
  userId: number;
  name: string | null;
  email: string;
  role: string;
  skills: string | null;
  experience: string | null;
  bio: string | null;
  portfolioLinks: string | null;
}

export interface UserProfileUpdateDto {
  name?: string | null;
  skills?: string | null;
  experience?: string | null;
  bio?: string | null;
  portfolioLinks?: string | null;
}
