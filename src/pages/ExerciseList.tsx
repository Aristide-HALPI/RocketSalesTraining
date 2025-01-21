import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Exercise, ExerciseStatus } from '../types/database';

export default function ExerciseList() {
  const { currentUser } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ExerciseStatus>('published');

  useEffect(() => {
    loadExercises();
  }, [currentUser, status]);

  async function loadExercises() {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError('');

      const exercisesRef = collection(db, 'exercises');
      const q = query(
        exercisesRef,
        where('status', '==', status),
        orderBy('metadata.createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const exercisesList = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Exercise[];

      setExercises(exercisesList);
    } catch (err) {
      console.error('Erreur lors du chargement des exercices:', err);
      setError('Impossible de charger les exercices');
    } finally {
      setLoading(false);
    }
  }

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
                        to={`/exercises/${exercise.id}`}
                        className="hover:text-teal-600"
                      >
                        {exercise.title}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {exercise.description}
                    </p>
                    {exercise.tags.length > 0 && (
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {status === 'published' ? 'Publié' :
                       status === 'draft' ? 'Brouillon' : 'Archivé'}
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