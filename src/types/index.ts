export interface User {
  uid: string;
  role: 'learner' | 'trainer';
  name: string;
  email: string;
  status: 'actif' | 'archivé' | 'supprimé';
  createdAt: Date;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  maxScore: number;
  evaluationGrid: Record<string, number>;
  commentFieldAvailable: boolean;
}

export interface UserExercise {
  id: string;
  userId: string;
  exerciseId: string;
  completed: boolean;
  responses: Record<string, string>;
  generalComment?: string;
  finalScore?: number;
  trainerId?: string;
}