export interface AIEvaluationRequest {
  type: 'iiep' | 'rdv_decideur';
  category: 'interroger' | 'investiguer' | 'empathie' | 'proposer';
  response: string;
  context: string;
}

export interface AIEvaluation {
  score: number;
  feedback: string;
}

class AIService {
  async evaluateResponse(request: AIEvaluationRequest): Promise<AIEvaluation> {
    // TODO: Implement actual AI evaluation
    // Pour l'instant, retourne une évaluation mock
    return {
      score: 1,
      feedback: "Réponse à améliorer"
    };
  }
}

export const aiService = new AIService();
