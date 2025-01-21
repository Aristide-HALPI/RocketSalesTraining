export type ExerciseType = 
  | 'goalkeeper'
  | 'three_sections'
  | 'decision_maker_meeting'
  | 'iiep'
  | 'company_presentation'
  | 'eombus_paf_i'
  | 'three_keys'
  | 'cdab';

export type EvaluationWorkflow = 
  | 'manual'           // Correction manuelle uniquement
  | 'ai_with_review'   // L'IA évalue, le formateur valide
  | 'ai_auto_publish'  // L'IA évalue et publie automatiquement
  | 'auto_correction'; // Correction et publication automatiques sans IA ni formateur

export type EvaluationStatus = 'pending' | 'ai_evaluated' | 'trainer_reviewing' | 'published';

export interface ScoringCriteria {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  scoreOptions: number[];
  required: boolean;
  score?: number;
  feedback?: string;
  subCriteria?: {
    name: string;
    points: number;
  }[];
}

export interface AIEvaluation {
  criteria: ScoringCriteria[];
  feedback: string;
  evaluatedAt: string;
  confidence: number; // Score de confiance de l'IA entre 0 et 1
  warnings?: string[]; // Avertissements éventuels sur l'évaluation
}

export interface TrainerReview {
  criteria: ScoringCriteria[];
  feedback: string;
  reviewedAt: string;
  reviewedBy: string;
  aiAgreementScore?: number; // Score d'accord avec l'évaluation de l'IA (0-1)
  modifiedCriteria?: string[]; // Liste des critères modifiés par le formateur
}

export interface EvaluationState {
  exerciseType: ExerciseType;
  status: EvaluationStatus;
  workflow: EvaluationWorkflow;
  submittedAt: string;
  submittedBy: string;
  aiEvaluation?: AIEvaluation;
  trainerReview?: TrainerReview;
  publishedAt?: string;
  publishedBy?: string;
  version: number; // Pour suivre les modifications de l'évaluation
}

// Type générique pour les exercices
export interface Exercise<T = any> {
  id: string;
  type: ExerciseType;
  userId: string;
  content: T; // Contenu spécifique à chaque type d'exercice
  evaluation: EvaluationState;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    aiEnabled?: boolean;
    aiModel?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    timeLimit?: number;
    tags?: string[];
  };
}
