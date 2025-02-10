import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clock, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ExerciseStatus } from '../types/exercises';

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
  status: ExerciseStatus;
  score?: number;
  lastUpdated?: string;
  type?: 'eisenhower' | 'welcome' | 'goalkeeper' | 'sections' | 'solution' | 'rdv_decideur' | 'iiep' | 'presentation' | 'eombus' | 'cles' | 'cdab' | 'outil_cdab' | 'objections' | 'points_bonus' | 'points_role_final' | 'certification' | 'company';
  isAutoCorrected?: boolean;
  isViewOnly?: boolean;
  statusColor?: string;
  statusText?: string;
  duration?: string;
}

// Liste complète des exercices disponibles dans l'ordre de la page principale
const AVAILABLE_EXERCISES = [
  {
    id: 'welcome',
    title: 'Bienvenue',
    description: 'Message de bienvenue et instructions générales',
    type: 'welcome' as const,
    status: ExerciseStatus.NotStarted as const,
    isViewOnly: true,
    duration: '5 min'
  },
  {
    id: 'solution',
    title: 'Votre Solution',
    description: 'Décrivez votre solution pour les exercices',
    type: 'solution' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '15 min'
  },
  {
    id: 'eisenhower',
    title: 'Matrice d\'Eisenhower',
    description: 'Priorisez vos tâches avec la matrice d\'Eisenhower',
    type: 'eisenhower' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: true,
    duration: '20 min'
  },
  {
    id: 'goalkeeper',
    title: 'Passer le Goalkeeper',
    description: 'Exercice de vente avec la méthode Goalkeeper',
    type: 'goalkeeper' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '25 min'
  },
  {
    id: 'sections',
    title: 'Les 3 sections',
    description: 'Exercice sur les motivateurs, caractéristiques et concepts de vente',
    type: 'sections' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '30 min'
  },
  {
    id: 'rdv_decideur',
    title: 'RDV avec le Décideur',
    description: 'Simulation d\'un rendez-vous avec un décideur',
    type: 'rdv_decideur' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '35 min'
  },
  {
    id: 'iiep',
    title: '(s\')IIEP',
    description: 'Méthode IIEP pour structurer votre approche commerciale',
    type: 'iiep' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '40 min'
  },
  {
    id: 'presentation',
    title: 'Présentation de votre société',
    description: 'Techniques pour présenter efficacement votre entreprise',
    type: 'presentation' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '35 min',
    path: '/presentation'
  },
  {
    id: 'eombus',
    title: 'EOMBUS-PAF-I',
    description: 'Apprenez à structurer votre approche commerciale',
    type: 'eombus' as const,
    duration: '120 min',
    isAutoCorrected: false
  },
  {
    id: 'cles',
    title: 'Les 3 Clés',
    description: 'Points clés de la négociation',
    type: 'cles' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '90 min'
  },
  {
    id: 'cdab',
    title: 'CDAB',
    description: 'Apprenez à structurer votre discours avec la méthode CDAB',
    type: 'cdab' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '25 min'
  },
  {
    id: 'outil_cdab',
    title: 'OUTIL CDAB',
    description: 'Mettez en pratique la méthode CDAB sur différents scénarios',
    type: 'outil_cdab' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '35 min'
  },
  {
    id: 'objections',
    title: 'Objections',
    description: 'Gestion des objections clients',
    type: 'objections' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '90 min'
  },
  {
    id: 'points_bonus',
    title: 'Points Bonus',
    description: 'Techniques avancées et cas spéciaux',
    type: 'points_bonus' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '60 min'
  },
  {
    id: 'points_role_final',
    title: 'Points - Jeu de Rôle final',
    description: 'Mise en situation finale pour valider les acquis',
    type: 'points_role_final' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '60 min'
  },
  {
    id: 'certification',
    title: 'Certification',
    description: 'Bilan des résultats et certification finale',
    type: 'certification' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '10 min'
  },
  {
    id: 'company',
    title: 'Company',
    description: 'Exercice Company',
    type: 'company' as const,
    status: ExerciseStatus.NotStarted as const,
    isAutoCorrected: false,
    duration: '10 min'
  }
] as Exercise[];

const getStatusColor = (status: ExerciseStatus) => {
  switch (status) {
    case ExerciseStatus.NotStarted:
      return 'text-gray-600';
    case ExerciseStatus.Evaluated:
      return 'text-green-600';
    case ExerciseStatus.InProgress:
      return 'text-blue-600';
    case ExerciseStatus.Submitted:
      return 'text-orange-600';
    default:
      return 'text-gray-600';
  }
};

const getStatusText = (status: ExerciseStatus) => {
  switch (status) {
    case ExerciseStatus.NotStarted:
      return 'À débuter';
    case ExerciseStatus.InProgress:
      return 'En cours';
    case ExerciseStatus.Submitted:
      return 'En attente de correction';
    case ExerciseStatus.Evaluated:
      return 'Terminé';
    default:
      return 'À débuter';
  }
};

export default function StudentExercises() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<User | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);

        // Récupérer les informations de l'étudiant
        const studentDoc = await getDoc(doc(db, 'users', userId));
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

        // Récupérer tous les exercices de l'utilisateur
        const userExercisesRef = collection(db, `users/${userId}/exercises`);
        const userExercisesSnapshot = await getDocs(userExercisesRef);
        const userExercises = new Map(
          userExercisesSnapshot.docs.map(doc => [doc.id, doc.data()])
        );

        // Créer la liste complète des exercices avec leur statut
        const allExercises = AVAILABLE_EXERCISES.map(exercise => {
          const userExercise = userExercises.get(exercise.id);
          return {
            ...exercise,
            status: userExercise?.status || ExerciseStatus.NotStarted,
            score: userExercise?.score,
            lastUpdated: userExercise?.lastUpdated,
            statusColor: getStatusColor(userExercise?.status || ExerciseStatus.NotStarted),
            statusText: getStatusText(userExercise?.status || ExerciseStatus.NotStarted)
          };
        });

        setExercises(allExercises);
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError(err instanceof Error ? err : new Error('Une erreur est survenue'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleExerciseClick = (exercise: Exercise) => {
    if (!userId) return;
    
    switch (exercise.type) {
      case 'eisenhower':
        navigate(`/eisenhower?userId=${userId}`);
        break;
      case 'welcome':
        navigate(`/welcome?userId=${userId}`);
        break;
      case 'goalkeeper':
        navigate(`/goalkeeper/${userId}`);
        break;
      case 'sections':
        navigate(`/sections?userId=${userId}`);
        break;
      case 'solution':
        navigate(`/solution?userId=${userId}`);
        break;
      case 'rdv_decideur':
        navigate(`/rdv-decideur?userId=${userId}`);
        break;
      case 'iiep':
        navigate(`/iiep?userId=${userId}`);
        break;
      case 'presentation':
        navigate(`/presentation?userId=${userId}`);
        break;
      case 'eombus':
        navigate(`/eombus-pafi?userId=${userId}`);
        break;
      case 'cles':
        navigate(`/cles?userId=${userId}`);
        break;
      case 'cdab':
        navigate(`/cdab?userId=${userId}`);
        break;
      case 'outil_cdab':
        navigate(`/cdab-practice?userId=${userId}`);
        break;
      case 'objections':
        navigate(`/objections?userId=${userId}`);
        break;
      case 'points_bonus':
        navigate(`/bonus?userId=${userId}`);
        break;
      case 'points_role_final':
        navigate(`/points-role-final?userId=${userId}`);
        break;
      case 'certification':
        navigate(`/certification?userId=${userId}`);
        break;
      case 'company':
        navigate(`/company?userId=${userId}`);
        break;
      default:
        console.warn('Type d\'exercice non géré:', exercise.type);
    }
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
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Erreur lors du chargement des exercices
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error.message}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {student && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Exercices de {student.firstName} {student.lastName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{student.email}</p>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleExerciseClick(exercise)}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{exercise.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{exercise.description}</p>
                  {exercise.duration && (
                    <p className="mt-1 text-sm text-gray-500">Durée: {exercise.duration}</p>
                  )}
                </div>
                <div className="ml-4 flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${exercise.statusColor}`}>
                    <Clock className="mr-1 h-4 w-4" />
                    {exercise.statusText}
                  </span>
                  {exercise.score !== undefined && (
                    <span className="ml-4 text-sm font-medium text-gray-900">
                      Score: {exercise.score}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExerciseClick(exercise);
                    }}
                  >
                    Voir
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
