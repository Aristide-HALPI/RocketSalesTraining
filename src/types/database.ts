export type UserRole = 'admin' | 'trainer' | 'learner';
export type UserStatus = 'actif' | 'inactif' | 'suspendu';
export type ExerciseStatus = 'draft' | 'published' | 'archived';
export type ExerciseDifficulty = 'débutant' | 'intermédiaire' | 'avancé';
export type ResourceType = 'pdf' | 'video' | 'link';

export interface UserPermissions {
  canManageExercises: boolean;
  canManageUsers: boolean;
  canEvaluate: boolean;
}

export interface UserSettings {
  notifications: boolean;
  language: string;
  theme: string;
}

export interface UserMetadata {
  lastUpdated: string; // ISO string
  updatedBy: string | null; // UID du formateur
  lastLoginAt?: string;
  lastActivityAt?: string;
  version: number;
}

export interface User {
  uid: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  lastLoginAt: string;
  archived: boolean;
  profilePicture: string;
  settings: UserSettings;
  permissions: UserPermissions;
  metadata: UserMetadata;
}

export interface SystemSettings {
  registration: {
    enabled: boolean;
    trainerCodeRequired: boolean;
    trainerCode?: string;
    autoApprove: boolean;
  };
  metadata: {
    lastUpdated: string; // ISO string
    updatedBy: string; // UID
  };
}

export interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  weight: number; // Pondération en pourcentage
}

export interface Resource {
  title: string;
  description: string;
  url: string;
  type: ResourceType;
}

export interface ExerciseMetadata {
  createdAt: string; // ISO string
  createdBy: string; // UID du formateur
  lastUpdated: string; // ISO string
  updatedBy: string;
  version: number;
}

export interface Question {
  questionId: string;
  text: string;
  type: string;
  options?: string[];
  points: number;
}

export interface Template {
  templateId: string;
  title: string;
  description: string;
  category: string;
  difficulty: number;
  estimatedDuration: number;
  tags: string[];
  version: number;
  isActive: boolean;
  content: {
    questions: Question[];
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: ExerciseDifficulty;
  duration: number; // Durée estimée en minutes
  maxScore: number;
  resources: Resource[];
  evaluationGrid: {
    criteria: EvaluationCriteria[];
    totalWeight: number; // Doit être égal à 100
  };
  instructions: string;
  metadata: ExerciseMetadata;
  prerequisites?: string[]; // IDs des exercices prérequis
  tags: string[];
  exerciseId: string;
  templateId: string;
  templateVersion: number;
  userId: string;
  status: ExerciseStatus;
  startedAt: string;
  submittedAt: string;
  timeSpent: number;
  attempts: number;
  dueDate: string;
  answers: Answer[];
  graded: boolean;
  grade: number;
  createdAt: string;
}

export interface Answer {
  questionId: string;
  answer: string;
  status: string;
  submittedAt: string;
}

export interface UserExerciseResponse {
  content: string;
  lastSaved: string;
  attachments?: {
    type: string;
    url: string;
  }[];
}

export interface CriteriaEvaluation {
  criteriaId: string;
  score: number;
  comment?: string;
}

export interface ExerciseEvaluation {
  criteria: CriteriaEvaluation[];
  generalComment?: string;
  finalScore: number;
  evaluatedBy: string;
  evaluatedAt: string;
}

export type ExerciseAction = 'created' | 'updated' | 'submitted' | 'evaluated' | 'saved';

export interface ExerciseHistoryEntry {
  timestamp: string;
  action: ExerciseAction;
  by: string;
}

export interface UserExerciseMetadata {
  createdAt: string;
  lastUpdated: string;
  version: number;
}

export interface UserExercise {
  id: string;
  userId: string;
  exerciseId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated';
  startedAt: string;
  submittedAt?: string;
  responses: Record<string, UserExerciseResponse>;
  evaluation?: ExerciseEvaluation;
  history: ExerciseHistoryEntry[];
  metadata: UserExerciseMetadata;
}

export interface QuestionFeedback {
  questionId: string;
  comment: string;
  points: number;
}

export interface Feedback {
  feedbackId: string;
  formateurId: string;
  generalComment: string;
  grade: number;
  submittedAt: string;
  questionFeedback: QuestionFeedback[];
  visibility: boolean;
}

export interface CategoryProgress {
  completed: number;
  average: number;
  timeSpent: number;
}

export interface Statistics {
  userId: string;
  completedExercises: number;
  averageGrade: number;
  totalTimeSpent: number;
  lastActivityDate: string;
  progressByCategory: {
    [categoryId: string]: CategoryProgress;
  };
  updatedAt: string;
}

export interface LogDetails {
  type: string;
  resourceId: string;
  description: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
}

export interface Log {
  logId: string;
  userId: string;
  action: string;
  timestamp: string;
  details: LogDetails;
  ip: string;
  userAgent: string;
}
