export interface Exercise {
  id: string;
  templateId: string;
  templateVersion: number;
  title: string;
  description: string;
  category: string;
  userId: string;
  status: 'en cours' | 'soumis' | 'évalué';
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
}

export interface Answer {
  questionId: string;
  response: any;
  timestamp: string;
}

export interface ExerciseFeedback {
  formateurId: string;
  comment: string;
  grade: number;
  submittedAt: string;
  questionFeedback?: {
    questionId: string;
    comment: string;
    points: number;
  }[];
}
