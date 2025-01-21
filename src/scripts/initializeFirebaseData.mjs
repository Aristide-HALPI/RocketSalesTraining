import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

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
        lines: Array.from({ length: 18 }, (_, index) => ({
          id: index + 1,
          speaker: index % 2 === 0 ? 'goalkeeper' : 'commercial',
          text: index % 2 === 0 ? [
            "Bonjour, société X j'écoute",
            "Non désolé il n'est pas disponible",
            "Je ne peux pas vous dire",
            "Non je ne peux pas vous aider",
            "Je ne sais pas quand il sera disponible",
            "Non je ne peux pas vous donner son agenda",
            "Je ne peux rien faire pour vous",
            "Non vraiment je ne peux pas vous aider",
            "Au revoir"
          ][Math.floor(index/2)] || "" : "",
          required: index % 2 === 0
        }))
      },
      secondCall: {
        lines: Array.from({ length: 5 }, (_, index) => ({
          id: index + 19,
          speaker: index % 2 === 0 ? 'commercial' : 'goalkeeper',
          text: index % 2 !== 0 ? [
            "Oui j'écoute",
            "Ah oui je me souviens de vous"
          ][Math.floor(index/2)] || "" : "",
          required: index % 2 !== 0
        }))
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
          },
          {
            name: "Écoute active",
            description: "Capacité à démontrer une écoute active et à rebondir sur les réponses",
            maxPoints: 2,
            scoreOptions: [0, 0.5, 1, 1.5, 2],
            subCriteria: [
              { name: "Reformulation des objections", points: 0.5 },
              { name: "Questions pertinentes", points: 0.5 },
              { name: "Adaptation aux réponses", points: 1 }
            ]
          },
          {
            name: "Gestion des objections",
            description: "Efficacité dans le traitement des objections du goalkeeper",
            maxPoints: 3,
            scoreOptions: [0, 0.5, 1, 1.5, 2, 2.5, 3],
            subCriteria: [
              { name: "Utilisation de la technique du 'oui, mais'", points: 1 },
              { name: "Arguments pertinents", points: 1 },
              { name: "Réponses constructives aux refus", points: 1 }
            ]
          },
          {
            name: "Persistance professionnelle",
            description: "Capacité à maintenir le dialogue de manière constructive",
            maxPoints: 2,
            scoreOptions: [0, 0.5, 1, 1.5, 2],
            subCriteria: [
              { name: "Insistance appropriée", points: 0.5 },
              { name: "Maintien du professionnalisme", points: 0.5 },
              { name: "Gestion du refus", points: 1 }
            ]
          },
          {
            name: "Application des techniques",
            description: "Utilisation des techniques apprises pendant la formation",
            maxPoints: 2,
            scoreOptions: [0, 0.5, 1, 1.5, 2],
            subCriteria: [
              { name: "Techniques de questionnement", points: 0.5 },
              { name: "Techniques de reformulation", points: 0.5 },
              { name: "Techniques de conclusion", points: 1 }
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
