import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const exercises = [
  {
    id: 'ex1',
    title: 'Analyse des besoins client',
    description: 'Apprendre à identifier et analyser les besoins spécifiques des clients',
    status: 'active',
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  // ... autres exercices
];

export async function initializeFirebaseData() {
  try {
    // Initialiser les exercices
    const exercisesCollection = collection(db, 'exercises');
    for (const exercise of exercises) {
      await setDoc(doc(exercisesCollection, exercise.id), exercise);
    }

    console.log('Données Firebase initialisées avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des données:', error);
  }
}
