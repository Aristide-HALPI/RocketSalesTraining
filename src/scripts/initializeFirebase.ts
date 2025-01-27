import { collection, doc, setDoc } from 'firebase/firestore';
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
    // Créer un utilisateur test
    const userRef = doc(db, 'users', 'testUser123');
    await setDoc(userRef, {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'student'
    });

    // Créer des exercices pour l'utilisateur test
    const exercisesRef = collection(db, 'users/testUser123/exercises');
    
    // Exercice Company
    await setDoc(doc(exercisesRef, 'company'), {
      id: 'company',
      title: 'Présentation de votre société',
      status: 'not_started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Exercice Objections
    await setDoc(doc(exercisesRef, 'objections'), {
      id: 'objections',
      title: 'Gestion des objections',
      status: 'not_started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Autres exercices...

    console.log('Données Firebase initialisées avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des données:', error);
  }
}
