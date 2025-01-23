import { AIEvaluationResponse, AIEvaluationCriterion } from '../../../services/AIService';

interface Answer {
  question: string;
  answer: string;
  sectionType: 'motivateurs' | 'caracteristiques' | 'concepts';
}

interface AIResponse {
  scores: number[];
  feedbacks: string[];
  globalFeedback: string;
  strengths: string[];
  improvements: string[];
}

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'https://api.example.com';
const AI_API_KEY = import.meta.env.VITE_AI_API_KEY;

// Critères d'évaluation par type de section
const EVALUATION_CRITERIA = {
  motivateurs: {
    name: 'Motivateurs Personnels',
    description: 'Évalue la pertinence et l\'impact des motivateurs identifiés',
    maxPoints: 2
  },
  caracteristiques: {
    name: 'Caractéristiques Uniques',
    description: 'Évalue la spécificité et la valeur des caractéristiques de vente',
    maxPoints: 2
  },
  concepts: {
    name: 'Concepts Uniques',
    description: 'Évalue l\'innovation et la pertinence des concepts de vente',
    maxPoints: 3
  }
};

export const AIService = {
  async evaluateAnswers(answers: Answer[]): Promise<AIEvaluationResponse> {
    try {
      const response = await fetch(`${AI_API_URL}/evaluate-sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          answers,
          evaluationType: 'sections',
          criteria: answers.map(answer => ({
            ...EVALUATION_CRITERIA[answer.sectionType],
            question: answer.question
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: AIResponse = await response.json();
      
      // Transformer la réponse en format AIEvaluationResponse
      const criteria: AIEvaluationCriterion[] = answers.map((answer, index) => ({
        id: `${answer.sectionType}-${index + 1}`,
        name: EVALUATION_CRITERIA[answer.sectionType].name,
        description: EVALUATION_CRITERIA[answer.sectionType].description,
        maxPoints: EVALUATION_CRITERIA[answer.sectionType].maxPoints,
        score: data.scores[index],
        feedback: data.feedbacks[index],
        consigne: answer.question
      }));

      // Calculer le score total sur 30 points
      const maxTotalScore = answers.reduce((total, answer) => 
        total + EVALUATION_CRITERIA[answer.sectionType].maxPoints, 0);
      const actualTotalScore = criteria.reduce((total, c) => total + c.score, 0);
      const normalizedScore = (actualTotalScore / maxTotalScore) * 30;

      return {
        score: normalizedScore,
        feedback: data.globalFeedback,
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        criteria
      };
    } catch (error) {
      console.error('Error evaluating answers:', error);
      throw error;
    }
  },

  async updateAIEvaluation(userId: string, evaluation: AIEvaluationResponse): Promise<void> {
    try {
      const response = await fetch(`${AI_API_URL}/update-evaluation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          userId,
          evaluation,
          exerciseType: 'sections'
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating AI evaluation:', error);
      throw error;
    }
  }
};
