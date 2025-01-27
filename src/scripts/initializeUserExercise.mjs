import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

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

// Email de l'utilisateur pour lequel initialiser l'exercice
const userEmail = 'am.dusenge@gmail.com'; // Remplacez par votre email

async function initializeUserExercise() {
  try {
    // Get user document by email
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', userEmail));
    const userSnap = await getDocs(userQuery);

    if (userSnap.empty) {
      console.error('User not found');
      return;
    }

    const userId = userSnap.docs[0].id;
    console.log('User ID trouvé:', userId);
    
    // Create exercise document for the user
    const exerciseRef = doc(db, `users/${userId}/exercises/points_role_final`);
    const exerciseData = {
      id: 'points_role_final',
      status: 'not_started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: [
        {
          title: "PROSPECTION",
          maxScore: 190,
          totalScore: 0,
          items: [
            { name: "Passer le Goalkeeper", maxPoints: 50, score: 0 },
            { name: "Vous ne vous présentez pas d'emblée", maxPoints: 10, score: 0 },
            { name: "Prénom [...] Prénom + Nom du Décideur", maxPoints: 10, score: 0 },
            { name: "Phrase complexe", maxPoints: 10, score: 0 },
            { name: "Quand est-ce que c'est le meilleur moment? ou Message Magique sur le répondeur automatique", maxPoints: 10, score: 0 },
            { name: "Prénom ou Nom du Goalkeeper", maxPoints: 10, score: 0 }
          ]
        },
        {
          title: "Prise de Rendez-vous avec le Décideur",
          maxScore: 30,
          totalScore: 0,
          items: [
            { name: "Vérification de son nom et son titre", maxPoints: 10, score: 0 },
            { name: "Présentez-vous et votre société (spécialité)", maxPoints: 10, score: 0 },
            { name: "Montrez du respect pour le temps du décideur", maxPoints: 10, score: 0 }
          ]
        },
        {
          title: "Accroche Irrésistible",
          maxScore: 70,
          totalScore: 0,
          items: [
            { name: "Question irrésistible", maxPoints: 20, score: 0 },
            { name: "Présentation irrésistible", maxPoints: 30, score: 0 },
            { name: "Référence client avec des chiffres à l'appui", maxPoints: 20, score: 0 }
          ]
        }
      ],
      totalScore: 0
    };

    await setDoc(exerciseRef, exerciseData);
    console.log('Exercise initialized successfully for user:', userId);
  } catch (error) {
    console.error('Error initializing exercise:', error);
  }
}

initializeUserExercise().catch(console.error);
