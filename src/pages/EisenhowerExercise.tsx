import { FC, useEffect, useState } from 'react';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { BackButton } from '../components/BackButton';
import { useExercisePersistence } from '../hooks/useExercisePersistence';
import { TaskAnswer, Priority } from '../types/eisenhower';
import { initialTasks } from '../data/eisenhowerTasks';
import { useLocation } from 'react-router-dom';

export const EisenhowerExercise: FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const viewMode = searchParams.get('mode') === 'view';
  const studentId = searchParams.get('userId');

  const [answers, setAnswers] = useState<TaskAnswer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);

  const { draftData, saveDraft } = useExercisePersistence('eisenhower');

  useEffect(() => {
    if (draftData && !isSubmitted) {
      setAnswers(draftData.answers || []);
    }
  }, [draftData, isSubmitted]);

  useEffect(() => {
    const checkSubmission = async () => {
      if (!auth.currentUser?.uid) return;
      
      const exerciseId = `eisenhower_${auth.currentUser.uid}`;
      const exerciseRef = doc(db, 'exercises', exerciseId);
      const exerciseSnap = await getDoc(exerciseRef);

      if (exerciseSnap.exists()) {
        setIsAlreadySubmitted(true);
        setIsSubmitted(true);
        setAnswers(exerciseSnap.data().answers || []);
        setShowResults(true);
      }
    };

    checkSubmission();
  }, []);

  useEffect(() => {
    const loadStudentExercise = async () => {
      if (viewMode && studentId) {
        const exerciseRef = doc(db, 'exercises', `eisenhower_${studentId}`);
        const exerciseDoc = await getDoc(exerciseRef);
        
        if (exerciseDoc.exists()) {
          const data = exerciseDoc.data();
          setAnswers(data.answers || []);
          setShowResults(true);
          setIsSubmitted(true);
        }
      }
    };

    loadStudentExercise();
  }, [viewMode, studentId]);

  const handlePriorityChange = (taskId: number, priority: Priority) => {
    const newAnswers = answers.map(a => 
      a.taskId === taskId 
        ? { ...a, selectedPriority: priority }
        : a
    );
    
    if (!newAnswers.find(a => a.taskId === taskId)) {
      newAnswers.push({ taskId, selectedPriority: priority, justification: '' });
    }
    
    setAnswers(newAnswers);
    saveDraft({ answers: newAnswers });
  };

  const calculateScore = () => {
    const total = initialTasks.length;
    const answered = answers.filter(a => a.selectedPriority !== null).length;
    
    // Points uniquement pour les priorités correctes
    const correctAnswers = initialTasks.reduce((acc, t) => {
      const answer = answers.find(a => a.taskId === t.id);
      return answer?.selectedPriority === Number(t.correctPriority) ? acc + 1 : acc;
    }, 0);

    const percentage = (correctAnswers / total) * 100;
    const scaledScore = Math.round((correctAnswers / total) * 30); // Score sur 30

    return {
      total,
      answered,
      correctAnswers,
      percentage,
      scaledScore
    };
  };

  const handleSubmit = async () => {
    try {
      if (isAlreadySubmitted) {
        setError("Vous avez déjà soumis cet exercice. Une seule soumission est autorisée.");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      // Vérifier que toutes les questions ont une réponse
      const unanswered = initialTasks.filter(t => 
        !answers.find(a => a.taskId === t.id && a.selectedPriority !== null)
      );

      if (unanswered.length > 0) {
        setError(`Il vous reste ${unanswered.length} question${unanswered.length > 1 ? 's' : ''} sans réponse.`);
        return;
      }

      const score = calculateScore();

      // Créer l'ID unique pour l'exercice
      const exerciseId = `eisenhower_${auth.currentUser?.uid}`;

      // Préparer les données de l'exercice
      const exerciseData = {
        type: 'eisenhower',
        userId: auth.currentUser?.uid,
        answers,
        score: score.scaledScore,
        maxScore: 30,
        status: 'completed',
        isSubmitted: true,
        submittedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };

      // Sauvegarder dans la collection exercises
      const exerciseRef = doc(db, 'exercises', exerciseId);
      await setDoc(exerciseRef, exerciseData);
      
      setIsSubmitted(true);
      setShowResults(true);
      setSuccess('Exercice soumis avec succès !');
    } catch (error) {
      setError('Une erreur est survenue lors de la soumission.');
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = viewMode;

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton />

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {viewMode ? (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          Visualisation de l'exercice soumis par l'étudiant
        </div>
      ) : isAlreadySubmitted && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          Vous avez déjà soumis cet exercice. Voici vos résultats :
        </div>
      )}

      <div className="bg-gradient-to-r from-purple-100 via-blue-100 to-green-100 p-8 rounded-lg shadow-lg mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Matrice d'Eisenhower</h1>
        <p className="text-gray-600">Exercice de priorisation des tâches</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        {!isReadOnly && !isAlreadySubmitted && (
          <>
            <h2 className="text-2xl font-bold text-blue-600 mb-6">Instructions</h2>
            <p className="text-gray-700 text-lg mb-8">
              Vous êtes un commercial dans une entreprise de taille moyenne. 
              Pour chaque situation, choisissez la priorité appropriée (1, 2, 3 ou 4).
            </p>
          </>
        )}

        {/* Légende des priorités */}
        <div className="bg-blue-50 p-6 rounded-lg mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">Légende des priorités :</h3>
          <ul className="space-y-2">
            <li className="flex items-center text-gray-700">
              <span className="w-32">Priorité 4 :</span>
              <span>Ne pas faire</span>
            </li>
            <li className="flex items-center text-gray-700">
              <span className="w-32">Priorité 3 :</span>
              <span>Déléguer</span>
            </li>
            <li className="flex items-center text-gray-700">
              <span className="w-32">Priorité 2 :</span>
              <span>Planifier</span>
            </li>
            <li className="flex items-center text-gray-700">
              <span className="w-32">Priorité 1 :</span>
              <span>Faire immédiatement</span>
            </li>
          </ul>
        </div>

        {/* Liste des tâches */}
        <div className="space-y-8">
          {initialTasks.map((task) => (
            <div key={task.id} className={`p-6 border rounded-lg ${
              showResults 
                ? answers.find(a => a.taskId === task.id)?.selectedPriority === Number(task.correctPriority)
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                : 'bg-white border-gray-200'
            }`}>
              <p className="text-gray-800 mb-4">{task.description}</p>
              
              <div className="flex gap-6 mb-4">
                {[1, 2, 3, 4].map((priority) => (
                  <label key={priority} className="inline-flex items-center">
                    <input
                      type="radio"
                      name={`priority-${task.id}`}
                      value={priority}
                      checked={answers.find(a => a.taskId === task.id)?.selectedPriority === priority || false}
                      onChange={() => !isReadOnly && handlePriorityChange(task.id, priority as Priority)}
                      className="form-radio h-4 w-4 text-blue-600"
                      disabled={isReadOnly || isSubmitted}
                    />
                    <span className="ml-2">Priorité {priority}</span>
                  </label>
                ))}
              </div>

              {showResults && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Réponse correcte :</span>
                    <span className="text-green-600">Priorité {task.correctPriority}</span>
                  </div>
                  <p className="text-gray-600">{task.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {showResults && (
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Résultats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-600">Total des questions</p>
                <p className="text-2xl font-bold">{initialTasks.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Questions répondues</p>
                <p className="text-2xl font-bold">{calculateScore().answered}</p>
              </div>
              <div>
                <p className="text-gray-600">Réponses correctes</p>
                <p className="text-2xl font-bold">{calculateScore().correctAnswers}</p>
              </div>
              <div>
                <p className="text-gray-600">Score final</p>
                <p className="text-2xl font-bold">{calculateScore().scaledScore}/30</p>
              </div>
            </div>
          </div>
        )}

        {!isReadOnly && !isSubmitted && (
          <div className="flex justify-end mt-8">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Envoi en cours...' : 'Soumettre mes réponses'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
