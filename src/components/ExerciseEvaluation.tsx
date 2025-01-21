import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { useExerciseEvaluation } from '../hooks/useExerciseEvaluation';
import type { Exercise, CriteriaEvaluation } from '../types/database';
import { 
  EvaluationWorkflow, 
  ScoringCriteria,
  AIEvaluation,
  TrainerReview 
} from '../types/evaluation';

interface ExerciseEvaluationProps {
  exerciseId: string;
  exercise: Exercise;
  onEvaluationComplete?: () => void;
}

export default function ExerciseEvaluation({ exerciseId, exercise, onEvaluationComplete }: ExerciseEvaluationProps) {
  const { currentUser } = useAuth();
  const {
    evaluation,
    isFormateur,
    error: evalError,
    updateWorkflow,
    saveAIEvaluation,
    saveTrainerReview
  } = useExerciseEvaluation({ exerciseId });

  const [criteriaEvaluations, setCriteriaEvaluations] = useState<ScoringCriteria[]>(
    exercise.evaluationGrid.criteria.map(criterion => ({
      id: criterion.name,
      name: criterion.name,
      description: criterion.description,
      maxPoints: criterion.maxPoints,
      scoreOptions: Array.from({ length: criterion.maxPoints + 1 }, (_, i) => i),
      required: true,
      score: 0,
      feedback: ''
    }))
  );
  const [generalComment, setGeneralComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleWorkflowChange = async (workflow: EvaluationWorkflow) => {
    try {
      await updateWorkflow(workflow);
      if (workflow === 'ai_auto_publish') {
        await requestAIEvaluation();
      }
    } catch (err) {
      setError('Erreur lors du changement de workflow');
    }
  };

  const requestAIEvaluation = async () => {
    try {
      setSubmitting(true);
      const aiEvaluation: AIEvaluation = {
        criteria: criteriaEvaluations,
        feedback: "Évaluation IA en cours de développement",
        evaluatedAt: new Date().toISOString(),
        confidence: 0.8,
        warnings: []
      };
      await saveAIEvaluation(aiEvaluation);
    } catch (err) {
      setError('Erreur lors de l\'évaluation IA');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isFormateur) return;

    try {
      setSubmitting(true);
      setError('');

      const now = new Date().toISOString();
      const trainerReview: TrainerReview = {
        criteria: criteriaEvaluations,
        feedback: generalComment,
        reviewedAt: now,
        reviewedBy: currentUser.uid,
        aiAgreementScore: evaluation?.aiEvaluation ? 0.9 : undefined,
        modifiedCriteria: []
      };

      await saveTrainerReview(trainerReview);
      if (onEvaluationComplete) {
        onEvaluationComplete();
      }
    } catch (err) {
      console.error('Erreur lors de l\'évaluation:', err);
      setError('Impossible de soumettre l\'évaluation');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isFormateur) {
    return (
      <div className="text-center py-8">
        <p>Vous n'avez pas les permissions nécessaires pour évaluer cet exercice.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(error || evalError) && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error || evalError}</div>
        </div>
      )}

      {/* Sélection du workflow d'évaluation */}
      {!evaluation?.status || evaluation.status === 'pending' ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Choisir le mode d'évaluation</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Button
              onClick={() => handleWorkflowChange('manual')}
              className="p-4 border rounded-lg text-center hover:bg-gray-50"
            >
              <h4 className="font-medium">Évaluation Manuelle</h4>
              <p className="text-sm text-gray-500 mt-2">
                Évaluer l'exercice vous-même sans l'aide de l'IA
              </p>
            </Button>

            <Button
              onClick={() => handleWorkflowChange('ai_with_review')}
              className="p-4 border rounded-lg text-center hover:bg-gray-50"
            >
              <h4 className="font-medium">IA avec Révision</h4>
              <p className="text-sm text-gray-500 mt-2">
                L'IA évalue d'abord, puis vous révisez avant publication
              </p>
            </Button>

            <Button
              onClick={() => handleWorkflowChange('ai_auto_publish')}
              className="p-4 border rounded-lg text-center hover:bg-gray-50"
            >
              <h4 className="font-medium">IA Automatique</h4>
              <p className="text-sm text-gray-500 mt-2">
                L'IA évalue et publie automatiquement
              </p>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Affichage de l'évaluation IA si disponible */}
          {evaluation?.aiEvaluation && (
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-blue-900 mb-4">Évaluation IA</h3>
              <div className="space-y-4">
                <p className="text-blue-800">
                  Score de confiance : {(evaluation.aiEvaluation.confidence * 100).toFixed(1)}%
                </p>
                <div className="bg-white p-4 rounded">
                  <p className="text-gray-700">{evaluation.aiEvaluation.feedback}</p>
                </div>
              </div>
            </div>
          )}

          {/* Grille d'évaluation */}
          <div className="space-y-6">
            {exercise.evaluationGrid.criteria.map((criterion, index) => (
              <div key={criterion.name} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{criterion.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{criterion.description}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Score</label>
                    <input
                      type="number"
                      value={criteriaEvaluations[index].score}
                      onChange={(e) => {
                        const newEvaluations = [...criteriaEvaluations];
                        newEvaluations[index].score = Math.min(
                          criterion.maxPoints,
                          Math.max(0, parseInt(e.target.value) || 0)
                        );
                        setCriteriaEvaluations(newEvaluations);
                      }}
                      min={0}
                      max={criterion.maxPoints}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Commentaire</label>
                    <textarea
                      value={criteriaEvaluations[index].feedback}
                      onChange={(e) => {
                        const newEvaluations = [...criteriaEvaluations];
                        newEvaluations[index].feedback = e.target.value;
                        setCriteriaEvaluations(newEvaluations);
                      }}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Commentaire général */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Commentaire général
            </label>
            <textarea
              value={generalComment}
              onChange={(e) => setGeneralComment(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
              disabled={submitting}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            {evaluation?.workflow === 'ai_with_review' && !evaluation.aiEvaluation && (
              <Button
                type="button"
                onClick={requestAIEvaluation}
                disabled={submitting}
                className="bg-blue-600 text-white"
              >
                Demander l'évaluation IA
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={submitting}
              className="bg-green-600 text-white"
            >
              {submitting ? 'En cours...' : 'Publier l\'évaluation'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
