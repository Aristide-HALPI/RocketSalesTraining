import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, UserRole, UserStatus, UserMetadata, UserPermissions } from '../types/user';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  register: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.email);
      setCurrentUser(user);
      if (user) {
        try {
          // Vérifier d'abord par email
          const emailQuery = query(collection(db, 'users'), where('email', '==', user.email));
          const emailQuerySnapshot = await getDocs(emailQuery);
          
          if (!emailQuerySnapshot.empty) {
            console.log('Found user with matching email');
            const existingUserData = emailQuerySnapshot.docs[0].data() as User;
            
            // Si l'UID est différent, mettre à jour le document avec le nouvel UID
            if (existingUserData.uid !== user.uid) {
              console.log('Updating user UID in database');
              const oldDocRef = doc(db, 'users', emailQuerySnapshot.docs[0].id);
              const newDocRef = doc(db, 'users', user.uid);
              
              await setDoc(newDocRef, {
                ...existingUserData,
                uid: user.uid,
                updatedAt: new Date().toISOString()
              });
              
              // Supprimer l'ancien document
              await deleteDoc(oldDocRef);
            }
            
            setUserProfile(existingUserData);
          } else {
            console.log('No user found with this email');
            setUserProfile(null);
            await signOut(auth);
            throw new Error('Compte non trouvé. Veuillez vous inscrire via la page d\'inscription pour accéder à la plateforme.');
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function register(email: string, password: string, userData: Partial<User>) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const currentTime = new Date().toISOString();
    const metadata: UserMetadata = {
      lastUpdated: currentTime,
      updatedBy: null,
      lastLoginAt: currentTime,
      lastActivityAt: currentTime,
      version: 1
    };

    const userPermissions: UserPermissions = {
      canManageExercises: userData.role === 'formateur' || userData.role === 'admin',
      canManageUsers: userData.role === 'admin'
    };

    const userDoc: User = {
      uid: user.uid,
      email: user.email!,
      firstName: userData.firstName!,
      lastName: userData.lastName!,
      fullName: `${userData.firstName} ${userData.lastName}`,
      role: (userData.role || 'apprenant') as UserRole,
      status: 'actif' as UserStatus,
      createdAt: currentTime,
      updatedAt: currentTime,
      lastLogin: currentTime,
      permissions: userPermissions,
      metadata: metadata
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);
    setUserProfile(userDoc);
  }

  async function login(email: string, password: string) {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      setUserProfile(userDoc.data() as User);
    } else {
      console.log('No user document found in database');
      // L'utilisateur n'existe pas dans la base de données
      setUserProfile(null);
      // Déconnexion de l'utilisateur
      await signOut(auth);
      throw new Error('Compte non trouvé. Veuillez vous inscrire via la page d\'inscription pour accéder à la plateforme.');
    }
  }

  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  const value = {
    currentUser,
    userProfile,
    register,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}