import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import ExerciseForm from '../components/ExerciseForm';
import type { Exercise } from '../types/database';

export default function CreateExercise() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (exercise: Exercise) => {
    if (!currentUser) return;

    try {
      const exerciseData = {
        ...exercise,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        status: 'not_started'
      };

      const docRef = await addDoc(collection(db, `users/${currentUser.uid}/exercises`), exerciseData);
      navigate(`/exercises/${docRef.id}`);
    } catch (err) {
      console.error('Error creating exercise:', err);
      setError('Une erreur est survenue lors de la création de l\'exercice');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Créer un nouvel exercice
      </h1>
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <ExerciseForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
