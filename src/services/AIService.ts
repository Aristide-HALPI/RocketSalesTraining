import { evaluateExercise as apiEvaluateExercise } from '../api/ai/routes/evaluation';
import type { ExerciseType, AIEvaluationResponse } from '../api/ai/routes/evaluation';

export interface AIEvaluationDialogue {
  index: number;
  score: string;
  comment: string;
}

export interface ExerciseEvaluationRequest {
  type: ExerciseType;
  content: string;
  organizationId: string;
  botId: string;
}

// Wrapper autour des nouvelles fonctions d'API pour maintenir la compatibilité
export const AIService = {
  evaluateExercise: async (request: ExerciseEvaluationRequest): Promise<AIEvaluationResponse> => {
    return apiEvaluateExercise(request.organizationId, request.content, request.type);
  },

  evaluateIIEPExercise(_content: any): Promise<AIEvaluationResponse> {
    throw new Error('Deprecated: use evaluateExercise instead');
  }
};
