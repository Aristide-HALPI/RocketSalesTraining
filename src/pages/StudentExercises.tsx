import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clock, XCircle, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Exercise {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'pending_validation';
  score?: number;
  lastUpdated?: string;
  type?: 'eisenhower' | 'welcome' | 'goalkeeper';
  isAutoCorrected?: boolean;
  isViewOnly?: boolean;
}

// Seuls Eisenhower et Bienvenue sont des exercices spéciaux
const SPECIAL_EXERCISES = [
  {
    id: 'eisenhower',
    title: 'Matrice d\'Eisenhower',
    description: 'Exercice de priorisation des tâches avec la matrice d\'Eisenhower',
    type: 'eisenhower' as const,
    status: 'not_started' as const,
    isAutoCorrected: true
  },
  {
    id: 'welcome',
    title: 'Exercice de bienvenue',
    description: 'Introduction à la formation',
    type: 'welcome' as const,
    status: 'not_started' as const,
    isViewOnly: true
  }
] as Exercise[];

export default function StudentExercises() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<User | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer les informations de l'étudiant
        const studentDoc = await getDoc(doc(db, 'users', userId!));
        if (!studentDoc.exists()) {
          throw new Error('Étudiant non trouvé');
        }
        const studentData = studentDoc.data();
        setStudent({
          id: studentDoc.id,
          firstName: studentData.firstName || '',
          lastName: studentData.lastName || '',
          email: studentData.email || ''
        });

        // Récupérer l'exercice de bienvenue (toujours visible)
        const welcomeExercise = SPECIAL_EXERCISES[1];

        // Récupérer l'exercice Eisenhower s'il a été soumis
        const eisenhowerDoc = await getDoc(doc(db, 'exercises', `eisenhower_${userId}`));
        let eisenhowerExercise: Exercise | null = null;
        if (eisenhowerDoc.exists() && eisenhowerDoc.data().isSubmitted) {
          const eisenhowerData = eisenhowerDoc.data();
          eisenhowerExercise = {
            ...SPECIAL_EXERCISES[0],
            status: 'completed' as const,
            score: eisenhowerData.score,
            lastUpdated: eisenhowerData.lastUpdated
          };
        }

        // Récupérer l'exercice Goalkeeper s'il existe
        const goalkeeperDoc = await getDoc(doc(db, 'exercises', `goalkeeper_${userId}`));
        let goalkeeperExercise: Exercise | null = null;
        if (goalkeeperDoc.exists() && goalkeeperDoc.data().isSubmitted) {
          const goalkeeperData = goalkeeperDoc.data();
          goalkeeperExercise = {
            id: 'goalkeeper',
            title: 'Exercice Goalkeeper',
            description: 'Exercice de dialogue commercial',
            type: 'goalkeeper' as const,
            status: goalkeeperData.isEvaluated ? 'completed' : 'pending_validation',
            score: goalkeeperData.totalScore,
            lastUpdated: goalkeeperData.lastUpdated
          };
        }

        // Combiner tous les exercices
        const allExercises = [
          welcomeExercise,
          ...(eisenhowerExercise ? [eisenhowerExercise] : []),
          ...(goalkeeperExercise ? [goalkeeperExercise] : [])
        ].filter((exercise): exercise is Exercise => exercise !== null);

        // Trier les exercices par titre
        allExercises.sort((a, b) => a.title.localeCompare(b.title));

        setExercises(allExercises);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'not_started':
        return <XCircle className="h-5 w-5 text-gray-400" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending_validation':
        return <CheckCircle className="h-5 w-5 text-orange-500" />;
      default:
        return null;
    }
  };

  const getActionButton = (exercise: Exercise) => {
    if (exercise.type === 'eisenhower' || exercise.type === 'welcome') {
      return (
        <Button
          onClick={() => navigate(`/${exercise.type}?userId=${userId}&mode=view`)}
          className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
        >
          Voir
        </Button>
      );
    }

    return (
      <Button
        onClick={() => navigate(`/evaluate/${userId}/${exercise.id}`)}
        className="inline-flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md"
      >
        {exercise.status === 'pending_validation' ? 'Valider correction' : 'Évaluer'}
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erreur lors du chargement des exercices</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error.message}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Exercices de {student ? `${student.firstName} ${student.lastName}` : ''}
          </h1>
          <Button
            onClick={() => navigate('/members')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md"
          >
            Retour à la liste des membres
          </Button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exercice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Note
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exercises.map((exercise) => (
                <tr key={exercise.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {exercise.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {exercise.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(exercise.status)}
                      <span className="ml-2 text-sm text-gray-500">
                        {exercise.status === 'pending_validation' ? 'En attente de validation' : 'Complété'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exercise.score !== undefined ? `${exercise.score}/30` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {getActionButton(exercise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
