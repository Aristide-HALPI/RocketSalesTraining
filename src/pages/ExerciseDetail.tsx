import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import ExerciseSubmission from '../components/ExerciseSubmission';
import ExerciseEvaluation from '../components/ExerciseEvaluation';
import type { Exercise, UserExercise } from '../types/database';

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [userExercise, setUserExercise] = useState<UserExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadExercise();
    }
  }, [id]);

  async function loadExercise() {
    try {
      setLoading(true);
      
      // Charger l'exercice
      const exerciseDoc = await getDoc(doc(db, 'Exercises', id!));
      if (!exerciseDoc.exists()) {
        setError('Exercice non trouvé');
        return;
      }
      
      const exerciseData = { ...exerciseDoc.data(), id: exerciseDoc.id } as Exercise;
      setExercise(exerciseData);

      // Charger la soumission de l'utilisateur si elle existe
      if (currentUser) {
        const userExerciseId = `${currentUser.uid}_${id}`;
        const userExerciseDoc = await getDoc(doc(db, 'UserExercises', userExerciseId));
        if (userExerciseDoc.exists()) {
          setUserExercise(userExerciseDoc.data() as UserExercise);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Impossible de charger l\'exercice');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error || 'Exercice non trouvé'}</div>
        </div>
      </div>
    );
  }

  const isFormateur = false;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {exercise.title}
          </h1>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Catégorie : {exercise.category}</span>
            <span>Difficulté : {exercise.difficulty}</span>
            <span>Durée : {exercise.duration} min</span>
          </div>
        </div>
        {isFormateur && (
          <Link to={`/exercises/${exercise.id}/edit`}>
            <Button variant="outline">
              Modifier l'exercice
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Description
          </h2>
          <p className="text-gray-600 whitespace-pre-wrap mb-4">
            {exercise.description}
          </p>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Instructions
          </h3>
          <p className="text-gray-600 whitespace-pre-wrap mb-4">
            {exercise.instructions}
          </p>

          {exercise.resources.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Ressources
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {exercise.resources.map((resource, index) => (
                  <div
                    key={index}
                    className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
                  >
                    <div className="flex-1 min-w-0">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="focus:outline-none"
                      >
                        <span className="absolute inset-0" aria-hidden="true" />
                        <p className="text-sm font-medium text-gray-900">
                          {resource.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {resource.description}
                        </p>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {isFormateur && userExercise?.status === 'submitted' ? (
            <>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Évaluation de l'exercice
              </h2>
              <ExerciseEvaluation
                exercise={exercise}
                exerciseId={exercise.id}
                userExercise={userExercise}
                onEvaluationComplete={loadExercise}
              />
            </>
          ) : (
            <>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {userExercise?.status === 'evaluated'
                  ? 'Votre soumission (évaluée)'
                  : userExercise?.status === 'submitted'
                  ? 'Votre soumission (en attente d\'évaluation)'
                  : 'Soumettre votre réponse'}
              </h2>
              <ExerciseSubmission
                exercise={exercise}
                onSubmit={loadExercise}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}