import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Exercise, ExerciseStatus } from '../types/database';
import { goalkeeperService } from '../features/goalkeeper/services/goalkeeperService';

// Type pour un exercice standard dans la liste
type StandardExercise = Exercise & { 
  exerciseType: 'standard';
  status: ExerciseStatus;
};

// Type pour un exercice goalkeeper dans la liste
interface BaseExerciseFields {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Exercise['difficulty'];
  duration: number;
  maxScore: number;
  tags: string[];
  metadata: {
    createdAt: string;
    createdBy: string;
    lastUpdated: string;
    updatedBy: string;
    version: number;
  };
  createdAt: string;
}

// Type pour un exercice goalkeeper dans la liste
interface GoalkeeperListItem extends BaseExerciseFields {
  exerciseType: 'goalkeeper';
  status: ExerciseStatus;
}

// Type pour un exercice dans la liste (standard ou goalkeeper)
type ExerciseListItem = StandardExercise | GoalkeeperListItem;

export default function ExerciseList() {
  const { currentUser } = useAuth();
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ExerciseStatus>('not_started');

  const loadExercises = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError('');

      // 1. Charger les exercices standards
      const exercisesRef = collection(db, `users/${currentUser.uid}/exercises`);
      const q = query(
        exercisesRef,
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const standardExercises = querySnapshot.docs.map(doc => ({
        ...(doc.data() as Exercise),
        id: doc.id,
        exerciseType: 'standard' as const,
        status: doc.data().status as ExerciseStatus
      }));

      // 2. Charger l'exercice Goalkeeper s'il existe
      let goalkeeperExercise = await goalkeeperService.getExercise(currentUser.uid);
      
      const allExercises: ExerciseListItem[] = [
        ...standardExercises,
        ...(goalkeeperExercise ? [{
          id: 'goalkeeper',
          title: 'Goalkeeper - Simulation d\'appel',
          description: 'Exercice de simulation d\'appel téléphonique',
          status: goalkeeperExercise.status,
          category: 'simulation',
          difficulty: 'intermédiaire',
          duration: 30,
          maxScore: 100,
          tags: ['simulation', 'appel'],
          exerciseType: 'goalkeeper' as const,
          metadata: {
            createdAt: goalkeeperExercise.createdAt,
            createdBy: currentUser.uid,
            lastUpdated: goalkeeperExercise.updatedAt,
            updatedBy: currentUser.uid,
            version: 1
          },
          createdAt: goalkeeperExercise.createdAt
        } satisfies GoalkeeperListItem] : []),
        {
          id: 'cdab',
          title: 'CDAB',
          description: 'Appliquez la méthode CDAB',
          status: 'not_started',
          category: 'methodologie',
          difficulty: 'intermédiaire',
          duration: 30,
          maxScore: 100,
          tags: ['cdab', 'methodologie'],
          exerciseType: 'standard' as const,
          metadata: {
            createdAt: new Date().toISOString(),
            createdBy: currentUser.uid,
            lastUpdated: new Date().toISOString(),
            updatedBy: currentUser.uid,
            version: 1
          },
          createdAt: new Date().toISOString()
        } satisfies StandardExercise
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setExercises(allExercises);
    } catch (err) {
      setError('Erreur lors du chargement des exercices');
      console.error('Error loading exercises:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, status]);

  useEffect(() => {
    const fetchExercises = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const exercisesRef = collection(db, `users/${currentUser.uid}/exercises`);
        const snapshot = await getDocs(exercisesRef);
        const exercisesData = snapshot.docs.map(doc => ({
          id: doc.id,
          exerciseType: 'standard' as const,
          status: doc.data().status as ExerciseStatus,
          title: doc.data().title || '',
          description: doc.data().description || '',
          category: doc.data().category || '',
          difficulty: doc.data().difficulty || 'débutant',
          duration: doc.data().duration || 0,
          maxScore: doc.data().maxScore || 0,
          tags: doc.data().tags || [],
          metadata: {
            createdAt: doc.data().createdAt || new Date().toISOString(),
            createdBy: doc.data().createdBy || currentUser.uid,
            lastUpdated: doc.data().updatedAt || new Date().toISOString(),
            updatedBy: doc.data().updatedBy || currentUser.uid,
            version: doc.data().version || 1
          },
          createdAt: doc.data().createdAt || new Date().toISOString()
        } satisfies ExerciseListItem));
        setExercises(exercisesData);
      } catch (error) {
        console.error('Error fetching exercises:', error);
        setError(error instanceof Error ? error.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchExercises();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadExercises();
    }
  }, [currentUser, loadExercises]);

  const getStatusText = (status: ExerciseStatus) => {
    switch (status) {
      case 'not_started':
        return 'À débuter';
      case 'in_progress':
        return 'En cours';
      case 'submitted':
        return 'En attente de correction';
      case 'evaluated':
        return 'Corrigé';
      default:
        return 'À débuter';
    }
  };

  const getStatusBadgeStyle = (status: ExerciseStatus) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'evaluated':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getExerciseTitle = (id: string): string => {
    switch (id) {
      case 'sections':
        return 'Les 3 sections';
      case 'meeting':
        return 'RDV Décideur';
      case 'presentation':
        return 'Présentation';
      case 'objections':
        return 'Objections';
      case 'cdab':
        return 'CDAB';
      case 'outil_cdab':
        return 'Outil CDAB - Mise en pratique';
      default:
        return 'Exercice';
    }
  };

  const getExerciseDescription = (id: string): string => {
    switch (id) {
      case 'sections':
        return 'Maîtrisez les 3 sections clés : Motivateurs, Caractéristiques et Concepts';
      case 'meeting':
        return 'Simulez un rendez-vous avec un décideur';
      case 'presentation':
        return 'Pratiquez vos compétences de présentation';
      case 'objections':
        return 'Apprenez à gérer les objections efficacement';
      case 'cdab':
        return 'Appliquez la méthode CDAB';
      case 'outil_cdab':
        return 'Mettez en pratique la méthode CDAB sur différents scénarios';
      default:
        return 'Description non disponible';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exercices</h1>
        {currentUser && (
          <Link
            to="/exercises/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Nouvel exercice
          </Link>
        )}
      </div>

      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setStatus('not_started')}
            className={`px-4 py-2 rounded-md ${
              status === 'not_started'
                ? 'bg-teal-100 text-teal-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            À débuter
          </button>
          <button
            onClick={() => setStatus('in_progress')}
            className={`px-4 py-2 rounded-md ${
              status === 'in_progress'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            En cours
          </button>
          <button
            onClick={() => setStatus('submitted')}
            className={`px-4 py-2 rounded-md ${
              status === 'submitted'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            En attente de correction
          </button>
          <button
            onClick={() => setStatus('evaluated')}
            className={`px-4 py-2 rounded-md ${
              status === 'evaluated'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Corrigé
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="p-4 text-center text-gray-600">Chargement...</div>
        ) : exercises.length === 0 ? (
          <div className="p-4 text-center text-gray-600">
            Aucun exercice trouvé
          </div>
        ) : (
          exercises.map((exercise) => {
            let exerciseLink = '#';
            switch (exercise.id) {
              case 'goalkeeper':
                exerciseLink = '/goalkeeper';
                break;
              case 'sections':
                exerciseLink = '/sections';
                break;
              case 'meeting':
                exerciseLink = '/rdv-decideur';
                break;
              case 'presentation':
                exerciseLink = '/presentation';
                break;
              case 'objections':
                exerciseLink = '/objections';
                break;
              case 'cdab':
                exerciseLink = '/cdab';
                break;
              case 'outil_cdab':
                exerciseLink = '/outils-cdab';
                break;
              default:
                exerciseLink = `/exercises/${exercise.id}`;
            }

            return (
              <Link
                key={exercise.id}
                to={exerciseLink}
                className="block p-6 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {exercise.title || getExerciseTitle(exercise.id)}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {exercise.description || getExerciseDescription(exercise.id)}
                    </p>
                    <div className="flex items-center space-x-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {exercise.status}
                      </span>
                      {exercise.difficulty && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {exercise.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}