import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDRsFI0XedzM2DIYXjhZSuSqS5mEiotpvA",
  authDomain: "rocketsalestraining-45557.firebaseapp.com",
  projectId: "rocketsalestraining-45557",
  storageBucket: "rocketsalestraining-45557.firebasestorage.app",
  messagingSenderId: "254114220226",
  appId: "1:254114220226:web:4a849fb9ebc7f65b4a935b"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export default { app, auth, db };
export { app, auth, db };