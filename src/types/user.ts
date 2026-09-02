// User profile setup interface based on Unstop's onboarding
export interface UserProfile {
  // Basic Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';

  // Profile
  bio: string;
  profilePicture: string;

  // Academic/Professional Information
  currentStatus: 'student' | 'working-professional' | 'entrepreneur' | 'other';
  institution?: string;
  course?: string;
  graduationYear?: string;
  company?: string;
  jobTitle?: string;
  workExperience?: string;

  // Location
  city: string;
  state: string;
  country: string;

  // Interests & Skills
  interests: string[];
  skills: string[];
  categories: string[]; // Event categories they're interested in

  // Social Media Links
  socialMedia: {
    linkedin?: string;
    github?: string;
    instagram?: string;
    twitter?: string;
    portfolio?: string;
  };

  // Preferences
  preferences: {
    emailNotifications: boolean;
    eventRecommendations: boolean;
    promotionalEmails: boolean;
    publicProfile: boolean;
  };

  // Internal fields
  isProfileComplete: boolean;
  createdAt: string;
  updatedAt: string;
  onboardingStep: number; // Track which step of onboarding they're on
}

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  fields: (keyof UserProfile)[];
  validation: Record<string, (value: unknown) => string | null>;
}
