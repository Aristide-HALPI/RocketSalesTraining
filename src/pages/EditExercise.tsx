import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import ExerciseForm from '../components/ExerciseForm';
import type { Exercise } from '../types/database';

export default function EditExercise() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [exercise, setExercise] = useState<Exercise>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExercise();
  }, [id]);

  async function loadExercise() {
    if (!id || !currentUser) return;

    try {
      setLoading(true);
      setError(null);

      const exerciseDoc = await getDoc(doc(db, 'exercises', id));
      if (!exerciseDoc.exists()) {
        setError('Exercice non trouvé');
        return;
      }

      setExercise({ ...exerciseDoc.data(), id: exerciseDoc.id } as Exercise);
    } catch (err) {
      console.error('Error loading exercise:', err);
      setError('Impossible de charger l\'exercice');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (exerciseData: Exercise) => {
    if (!id || !currentUser) return;

    try {
      setError(null);
      const now = new Date().toISOString();

      const updatedExercise = {
        ...exerciseData,
        metadata: {
          ...exerciseData.metadata,
          lastUpdated: now,
          updatedBy: currentUser.uid,
          version: (exerciseData.metadata?.version || 0) + 1
        }
      };

      await updateDoc(doc(db, 'exercises', id), updatedExercise);
      navigate(`/exercises/${id}`);
    } catch (err) {
      console.error('Error updating exercise:', err);
      setError('Une erreur est survenue lors de la mise à jour de l\'exercice');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Modifier l'exercice
      </h1>
      <div className="bg-white shadow-sm rounded-lg p-6">
        <ExerciseForm initialData={exercise} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
