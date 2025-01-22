import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';

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

// Sample data for each collection
const sampleUsers = [
  {
    uid: 'admin1',
    role: 'formateur',
    firstName: 'Aristide',
    lastName: 'Admin',
    email: 'Aristide@halpi.be',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    archived: false,
    profilePicture: '',
    settings: {
      notifications: true,
      language: 'fr',
      theme: 'light'
    }
  }
];

const sampleTemplates = [
  {
    templateId: 'goalkeeper',
    title: 'Passer le Goalkeeper',
    description: 'Exercice de dialogue avec un(e) goalkeeper pour atteindre le décideur',
    category: 'Techniques de vente',
    difficulty: 2,
    estimatedDuration: 45,
    order: 3,
    tags: ['goalkeeper', 'dialogue', 'objection'],
    version: 1,
    isActive: true,
    content: {
      type: 'dialogue',
      instructions: `
        Écrivez un dialogue complet d'une conversation téléphonique avec le/la "goalkeeper" 
        dans le but qu'il/elle vous passe le décideur (en utilisant les techniques apprises 
        pendant la formation)
      `,
      firstCall: {
        lines: [],
        maxLines: 18
      },
      secondCall: {
        lines: [],
        maxLines: 5
      },
      evaluationGrid: {
        maxPoints: 20,
        criteria: [
          {
            name: "Introduction et politesse",
            description: "Évaluation de la qualité de l'introduction et du maintien de la politesse",
            maxPoints: 1.5,
            scoreOptions: [0, 0.5, 1, 1.5],
            subCriteria: [
              { name: "Salutation professionnelle", points: 0.5 },
              { name: "Présentation claire", points: 0.5 },
              { name: "Maintien d'un ton respectueux", points: 0.5 }
            ]
          }
        ]
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin1'
  }
];

async function initializeCollection(collectionName, data) {
  console.log(`Initializing ${collectionName} collection...`);
  for (const item of data) {
    const docRef = doc(db, collectionName, item.templateId || item.uid);
    await setDoc(docRef, item);
    console.log(`Added document ${item.templateId || item.uid} to ${collectionName}`);
  }
}

async function main() {
  try {
    await initializeCollection('users', sampleUsers);
    await initializeCollection('templates', sampleTemplates);

    // Initialiser l'exercice goalkeeper pour chaque apprenant
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const users = usersSnapshot.docs.reduce((acc, doc) => ({ ...acc, [doc.id]: doc.data() }), {});

    for (const userId of Object.keys(users)) {
      if (users[userId].role === 'learner') {
        const exerciseRef = doc(db, `users/${userId}/exercises/goalkeeper`);
        const exerciseDoc = await getDoc(exerciseRef);

        if (!exerciseDoc.exists()) {
          console.log(`Initializing goalkeeper exercise for user: ${userId}`);
          await setDoc(exerciseRef, {
            id: userId,
            userId,
            status: 'in_progress',
            firstCall: { lines: [] },
            secondCall: { lines: [] },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
