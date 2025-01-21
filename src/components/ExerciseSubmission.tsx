import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import type { Exercise, UserExercise, UserExerciseResponse } from '../types/database';

interface ExerciseSubmissionProps {
  exercise: Exercise;
  onSubmit?: () => void;
}

export default function ExerciseSubmission({ exercise, onSubmit }: ExerciseSubmissionProps) {
  const { currentUser } = useAuth();
  const [userExercise, setUserExercise] = useState<UserExercise | null>(null);
  const [responses, setResponses] = useState<Record<string, UserExerciseResponse>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserExercise();
  }, [exercise.id, currentUser?.uid]);

  async function loadUserExercise() {
    if (!currentUser) return;

    try {
      const userExerciseId = `${currentUser.uid}_${exercise.id}`;
      const userExerciseDoc = await getDoc(doc(db, 'UserExercises', userExerciseId));

      if (userExerciseDoc.exists()) {
        setUserExercise(userExerciseDoc.data() as UserExercise);
        setResponses(userExerciseDoc.data().responses || {});
      }
    } catch (err) {
      console.error('Erreur lors du chargement de l\'exercice:', err);
      setError('Impossible de charger vos réponses');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setSubmitting(true);
      setError('');

      const now = new Date().toISOString();
      const userExerciseId = `${currentUser.uid}_${exercise.id}`;

      const historyEntry = {
        timestamp: now,
        action: 'submitted' as const,
        by: currentUser.uid
      };

      const userExerciseData: UserExercise = {
        id: userExerciseId,
        userId: currentUser.uid,
        exerciseId: exercise.id,
        status: 'submitted',
        startedAt: userExercise?.startedAt || now,
        submittedAt: now,
        responses,
        history: [...(userExercise?.history || []), historyEntry],
        metadata: {
          createdAt: userExercise?.metadata?.createdAt || now,
          lastUpdated: now,
          version: (userExercise?.metadata?.version || 0) + 1
        }
      };

      await setDoc(doc(db, 'UserExercises', userExerciseId), userExerciseData);
      setUserExercise(userExerciseData);
      
      if (onSubmit) {
        onSubmit();
      }
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      setError('Impossible de soumettre vos réponses');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    if (!currentUser) return;

    try {
      setSubmitting(true);
      setError('');

      const now = new Date().toISOString();
      const userExerciseId = `${currentUser.uid}_${exercise.id}`;

      const historyEntry = {
        timestamp: now,
        action: 'saved' as const,
        by: currentUser.uid
      };
      
      const userExerciseData: UserExercise = {
        id: userExerciseId,
        userId: currentUser.uid,
        exerciseId: exercise.id,
        status: 'in_progress',
        startedAt: userExercise?.startedAt || now,
        responses,
        history: [...(userExercise?.history || []), historyEntry],
        metadata: {
          createdAt: userExercise?.metadata?.createdAt || now,
          lastUpdated: now,
          version: (userExercise?.metadata?.version || 0) + 1
        }
      };

      await setDoc(doc(db, 'UserExercises', userExerciseId), userExerciseData);
      setUserExercise(userExerciseData);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Impossible de sauvegarder vos réponses');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div>Chargement...</div>;
  }

  const isSubmitted = userExercise?.status === 'submitted' || userExercise?.status === 'evaluated';
  const isEvaluated = userExercise?.status === 'evaluated';

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      {isEvaluated && userExercise.evaluation && (
        <div className="bg-green-50 p-4 rounded-md">
          <h3 className="text-lg font-medium text-green-800 mb-2">
            Évaluation
          </h3>
          <p className="text-sm text-green-700 mb-2">
            Score final : {userExercise.evaluation.finalScore} / {exercise.maxScore}
          </p>
          {userExercise.evaluation.generalComment && (
            <p className="text-sm text-green-700">
              Commentaire : {userExercise.evaluation.generalComment}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {exercise.evaluationGrid.criteria.map((criterion) => (
          <div key={criterion.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {criterion.name} ({criterion.maxPoints} points)
            </label>
            <p className="text-sm text-gray-500 mb-2">{criterion.description}</p>
            <div className="space-y-4">
              <textarea
                value={responses[criterion.id]?.content || ''}
                onChange={(e) => {
                  const now = new Date().toISOString();
                  const newResponses = { ...responses };
                  newResponses[criterion.id] = {
                    content: e.target.value,
                    lastSaved: now,
                    attachments: responses[criterion.id]?.attachments || []
                  };
                  setResponses(newResponses);
                }}
                disabled={isSubmitted}
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Votre réponse..."
              />
              
              {isEvaluated && userExercise.evaluation?.criteria.find(c => c.criteriaId === criterion.id) && (
                <div className="mt-2 text-sm">
                  <p className="font-medium text-gray-700">
                    Score : {userExercise.evaluation.criteria.find(c => c.criteriaId === criterion.id)?.score} / {criterion.maxPoints}
                  </p>
                  <p className="text-gray-600 mt-1">
                    {userExercise.evaluation.criteria.find(c => c.criteriaId === criterion.id)?.comment}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Commentaire général
          </label>
          <textarea
            value={responses['general_comment']?.content || ''}
            onChange={(e) => {
              const now = new Date().toISOString();
              const newResponses = { ...responses };
              newResponses['general_comment'] = {
                content: e.target.value,
                lastSaved: now,
                attachments: []
              };
              setResponses(newResponses);
            }}
            disabled={isSubmitted}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Commentaire additionnel..."
          />
        </div>

        {!isSubmitted && (
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              onClick={handleSaveDraft}
              disabled={submitting}
              variant="outline"
            >
              {submitting ? 'Sauvegarde...' : 'Sauvegarder le brouillon'}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Soumission...' : 'Soumettre l\'exercice'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
