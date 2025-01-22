import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

const userEmail = 'am.dusenge@gmail.com';

async function initializeUserExercise() {
  try {
    // Get the template
    const templateRef = doc(db, 'templates/goalkeeper');
    const templateSnap = await getDoc(templateRef);
    
    if (!templateSnap.exists()) {
      console.error('Template not found');
      return;
    }
    
    const template = templateSnap.data();

    // Get user document by email
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', userEmail));
    const userSnap = await getDocs(userQuery);

    if (userSnap.empty) {
      console.error('User not found');
      return;
    }

    const userId = userSnap.docs[0].id;
    
    // Create exercise document for the user
    const exerciseRef = doc(db, `users/${userId}/exercises/goalkeeper`);
    const exerciseData = {
      templateId: 'goalkeeper',
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: {
        firstCall: [],
        secondCall: []
      },
      evaluation: null,
      version: 1
    };

    await setDoc(exerciseRef, exerciseData);
    console.log('Exercise initialized for user:', userId);

  } catch (error) {
    console.error('Error initializing exercise:', error);
  }
}

initializeUserExercise().catch(console.error);
