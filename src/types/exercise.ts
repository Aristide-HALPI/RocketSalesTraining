export type ExerciseStatus = 'not_started' | 'in_progress' | 'pending_validation' | 'completed' | 'evaluated';

export interface Exercise {
  id: string;
  templateId: string;
  templateVersion: number;
  title: string;
  description: string;
  category: string;
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
  difficulty: number;
  tags: string[];
  feedback?: ExerciseFeedback;
  score?: number;
  lastUpdated?: string;
  type?: 'eisenhower' | 'welcome' | 'goalkeeper' | 'sections' | 'solution' | 'rdv_decideur' | 'iiep' | 'presentation' | 'eombus' | 'cles' | 'cdab' | 'outil_cdab' | 'objections' | 'points_bonus' | 'points_role_final' | 'certification';
  isAutoCorrected?: boolean;
  isViewOnly?: boolean;
  statusColor?: string;
  statusText?: string;
  duration?: string;
}

export interface Answer {
  questionId: string;
  response: any;
  timestamp: string;
}

export interface ExerciseFeedback {
  trainerId: string;
  comment: string;
  grade: number;
  submittedAt: string;
  questionFeedback?: {
    questionId: string;
    comment: string;
    points: number;
  }[];
}
