import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, WithFieldValue, DocumentData } from 'firebase/firestore';
import { User } from '../types/user';
import { Exercise } from '../types/exercise';

const firebaseConfig = {
  apiKey: "AIzaSyDRsFI0XedzM2DIYXjhZSuSqS5mEiotpvA",
  authDomain: "rocketsalestraining-45557.firebaseapp.com",
  projectId: "rocketsalestraining-45557",
  storageBucket: "rocketsalestraining-45557.firebasestorage.app",
  messagingSenderId: "254114220226",
  appId: "1:254114220226:web:4a849fb9ebc7f65b4a935b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const currentTime = new Date().toISOString();

// Sample data for each collection
const sampleUsers: User[] = [
  {
    uid: 'admin1',
    role: 'admin',
    firstName: 'Aristide',
    lastName: 'Admin',
    fullName: 'Aristide Admin',
    email: 'Aristide@halpi.be',
    status: 'actif',
    createdAt: currentTime,
    updatedAt: currentTime,
    lastLogin: currentTime,
    permissions: {
      canManageExercises: true,
      canManageUsers: true
    },
    metadata: {
      lastUpdated: currentTime,
      updatedBy: null,
      lastLoginAt: currentTime,
      lastActivityAt: currentTime,
      version: 1
    },
    profilePicture: '',
    settings: {
      notifications: true,
      language: 'fr',
      theme: 'light'
    }
  },
  {
    uid: 'trainer1',
    role: 'formateur',
    firstName: 'Manzi',
    lastName: 'Aristide',
    fullName: 'Manzi Aristide',
    email: 'Manzi.d.Aristide@gmail.com',
    status: 'actif',
    createdAt: currentTime,
    updatedAt: currentTime,
    lastLogin: currentTime,
    permissions: {
      canManageExercises: true,
      canManageUsers: false
    },
    metadata: {
      lastUpdated: currentTime,
      updatedBy: null,
      lastLoginAt: currentTime,
      lastActivityAt: currentTime,
      version: 1
    },
    profilePicture: '',
    settings: {
      notifications: true,
      language: 'fr',
      theme: 'light'
    }
  }
];

const sampleExercises: Exercise[] = [
  {
    id: 'exercise1',
    templateId: 'template1',
    templateVersion: 1,
    title: 'Introduction aux techniques de vente',
    description: 'Premier exercice de la formation',
    category: 'Vente',
    userId: 'user1',
    status: 'en cours',
    startedAt: currentTime,
    submittedAt: '',
    timeSpent: 0,
    attempts: 1,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    answers: [],
    graded: false,
    grade: 0,
    createdAt: currentTime,
    difficulty: 1,
    tags: ['débutant', 'vente']
  }
];

async function initializeCollection<T extends WithFieldValue<DocumentData>>(
  collectionName: string,
  data: T[]
): Promise<void> {
  console.log(`Initializing ${collectionName} collection...`);
  for (const item of data) {
    const docRef = doc(collection(db, collectionName));
    await setDoc(docRef, item);
  }
  console.log(`${collectionName} collection initialized`);
}

async function main() {
  try {
    await initializeCollection('users', sampleUsers);
    await initializeCollection('exercises', sampleExercises);
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
