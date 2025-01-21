import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDRsFI0XedzM2DIYXjhZSuSqS5mEiotpvA",
  authDomain: "rocketsalestraining-45557.firebaseapp.com",
  projectId: "rocketsalestraining-45557",
  storageBucket: "rocketsalestraining-45557.firebasestorage.app",
  messagingSenderId: "254114220226",
  appId: "1:254114220226:web:4a849fb9ebc7f65b4a935b"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function initializeSystemSettings() {
  const systemSettings = {
    registration: {
      enabled: true,
      trainerCodeRequired: true,
      trainerCode: 'TRAINER2024', // Code par défaut
      autoApprove: false
    },
    metadata: {
      lastUpdated: new Date().toISOString()
    }
  };

  try {
    await setDoc(doc(db, 'settings', 'system'), systemSettings);
    console.log('✅ Paramètres système initialisés avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des paramètres système:', error);
    return false;
  }
}

async function main() {
  console.log('Début de l\'initialisation de la base de données...');
  
  // Demander les identifiants
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: npm run init-db <email> <password>');
    process.exit(1);
  }

  try {
    // Connexion avec l'utilisateur formateur
    console.log('Connexion en cours...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Connexion réussie');

    // Initialisation des paramètres système
    await initializeSystemSettings();

    console.log('Fin de l\'initialisation de la base de données');
  } catch (error) {
    console.error('Erreur lors de la connexion:', error.message);
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('Erreur lors de l\'initialisation:', error);
  process.exit(1);
});
