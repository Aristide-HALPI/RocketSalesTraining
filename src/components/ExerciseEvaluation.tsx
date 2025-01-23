import { useState } from 'react';
import { Button } from './ui/button';
import { useExerciseEvaluation } from '../hooks/useExerciseEvaluation';
import type { Exercise, UserExercise } from '../types/database';
import { 
  EvaluationWorkflow, 
  EvaluationCriterion,
  AIEvaluation
} from '../types/evaluation';

interface ExerciseEvaluationProps {
  exerciseId: string;
  exercise: Exercise;
  userExercise: UserExercise;
  onEvaluationComplete?: () => void;
}

export default function ExerciseEvaluation({ exerciseId, exercise, userExercise, onEvaluationComplete }: ExerciseEvaluationProps) {
  const {
    evaluation,
    isFormateur,
    error: evalError,
    updateWorkflow,
    saveAIEvaluation
  } = useExerciseEvaluation({ exerciseId });

  const [criteriaEvaluations] = useState<EvaluationCriterion[]>(
    exercise.evaluationGrid.criteria.map(criterion => ({
      id: criterion.name,
      name: criterion.name,
      description: criterion.description,
      maxPoints: criterion.maxPoints,
      score: 0,
      feedback: '',
      consigne: criterion.description
    }))
  );

  const [error, setError] = useState<string>('');

  const handleWorkflowChange = async (workflow: EvaluationWorkflow) => {
    try {
      await updateWorkflow(workflow);
      if (workflow === 'ai_auto_publish') {
        await requestAIEvaluation();
      }
      onEvaluationComplete?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  const requestAIEvaluation = async () => {
    try {
      const aiEvaluation: AIEvaluation = {
        criteria: criteriaEvaluations.map(criterion => ({
          ...criterion,
          score: evaluateResponse(userExercise.responses, criterion)
        })),
        feedback: "Évaluation basée sur les réponses de l'utilisateur",
        evaluatedAt: new Date().toISOString(),
        confidence: 0.8,
        warnings: []
      };
      await saveAIEvaluation(aiEvaluation);
      onEvaluationComplete?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  const evaluateResponse = (responses: Record<string, any>, criterion: EvaluationCriterion): number => {
    // Récupérer la réponse correspondant au critère
    const response = responses[criterion.id];
    if (!response) return 0;

    // Évaluation basique basée sur la longueur de la réponse
    const contentLength = response.content?.length || 0;
    const score = Math.min(
      Math.floor((contentLength / 100) * criterion.maxPoints), // 1 point pour chaque 100 caractères
      criterion.maxPoints
    );

    return score;
  };

  return (
    <div className="space-y-6">
      {(error || evalError) && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">
            {error || (evalError instanceof Error ? evalError.message : 'Une erreur est survenue')}
          </p>
        </div>
      )}

      {evaluation && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Status: {evaluation.status}
            </h2>
            {isFormateur && (
              <div className="space-x-2">
                <Button
                  onClick={() => handleWorkflowChange('manual')}
                  variant={evaluation.workflow === 'manual' ? 'primary' : 'outline'}
                >
                  Correction manuelle
                </Button>
                <Button
                  onClick={() => handleWorkflowChange('ai_with_review')}
                  variant={evaluation.workflow === 'ai_with_review' ? 'primary' : 'outline'}
                >
                  IA avec révision
                </Button>
              </div>
            )}
          </div>

          {evaluation.aiEvaluation && (
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="font-semibold mb-2">Évaluation IA</h3>
              <p>Confiance: {evaluation.aiEvaluation.confidence * 100}%</p>
              <p>Feedback: {evaluation.aiEvaluation.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
