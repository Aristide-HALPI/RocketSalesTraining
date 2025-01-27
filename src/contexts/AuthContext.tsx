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
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User data from Firestore:', {
              uid: user.uid,
              email: user.email,
              role: userData.role
            });
            setUserProfile({ ...user, ...userData });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
      
      setCurrentUser(user);
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
      canManageExercises: userData.role === 'trainer' || userData.role === 'admin',
      canManageUsers: userData.role === 'admin'
    };

    const userDoc: User = {
      uid: user.uid,
      email: user.email!,
      firstName: userData.firstName!,
      lastName: userData.lastName!,
      fullName: `${userData.firstName} ${userData.lastName}`,
      role: (userData.role || 'learner') as UserRole,
      status: 'active' as UserStatus,
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