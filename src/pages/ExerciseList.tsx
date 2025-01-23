import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Exercise, ExerciseStatus, ExerciseDifficulty } from '../types/database';
import { goalkeeperService } from '../features/goalkeeper/services/goalkeeperService';
import type { GoalkeeperExercise } from '../features/goalkeeper/types';

// Type pour un exercice standard dans la liste
type StandardExercise = Exercise & { exerciseType: 'standard' };

// Type pour un exercice goalkeeper dans la liste
interface BaseExerciseFields {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: ExerciseDifficulty;
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
  status: GoalkeeperExercise['status'];
}

// Type pour un exercice dans la liste (standard ou goalkeeper)
type ExerciseListItem = StandardExercise | GoalkeeperListItem;

export default function ExerciseList() {
  const { currentUser } = useAuth();
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ExerciseStatus>('published');

  const loadExercises = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError('');

      // 1. Charger les exercices standards
      const exercisesRef = collection(db, 'exercises');
      const q = query(
        exercisesRef,
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const standardExercises = querySnapshot.docs.map(doc => ({
        ...(doc.data() as Exercise),
        id: doc.id,
        exerciseType: 'standard' as const
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
        } satisfies GoalkeeperListItem] : [])
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
    if (currentUser) {
      loadExercises();
    }
  }, [currentUser, loadExercises]);

  const getStatusBadgeStyle = (exerciseStatus: string) => {
    switch (exerciseStatus) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'evaluated':
        return 'bg-purple-100 text-purple-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (exerciseStatus: string) => {
    switch (exerciseStatus) {
      case 'published':
        return 'Publié';
      case 'draft':
        return 'Brouillon';
      case 'submitted':
        return 'Soumis';
      case 'evaluated':
        return 'Évalué';
      case 'in_progress':
        return 'En cours';
      default:
        return 'Non commencé';
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
            onClick={() => setStatus('published')}
            className={`px-4 py-2 rounded-md ${
              status === 'published'
                ? 'bg-teal-100 text-teal-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Publiés
          </button>
          <button
            onClick={() => setStatus('draft')}
            className={`px-4 py-2 rounded-md ${
              status === 'draft'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Brouillons
          </button>
          <button
            onClick={() => setStatus('archived')}
            className={`px-4 py-2 rounded-md ${
              status === 'archived'
                ? 'bg-gray-300 text-gray-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Archivés
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
          exercises.map((exercise) => (
            <div key={exercise.id} className="border-b border-gray-200">
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      <Link
                        to={exercise.exerciseType === 'goalkeeper' ? `/goalkeeper/${currentUser?.uid}` : `/exercises/${exercise.id}`}
                        className="hover:text-teal-600"
                      >
                        {exercise.title}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {exercise.description}
                    </p>
                    {exercise.tags?.length > 0 && (
                      <div className="mt-2">
                        {exercise.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 mr-2"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(exercise.status)}`}>
                      {getStatusLabel(exercise.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}