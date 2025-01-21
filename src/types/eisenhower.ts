export type Priority = 1 | 2 | 3 | 4;

export interface Task {
  id: number;
  description: string;
  correctPriority: string;
  explanation: string;
}

export interface TaskAnswer {
  taskId: number;
  selectedPriority: Priority | null;
  justification: string;
}

export interface Score {
  total: number;
  answered: number;
  correct: number;
  percentage: number;
}

export interface EisenhowerSubmission {
  userId: string;
  userName: string;
  answers: TaskAnswer[];
  score: Score;
  submittedAt?: any; // Firebase Timestamp
}
