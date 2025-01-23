import { db, auth } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser as deleteAuthUser } from 'firebase/auth';
import { User, UserStatus } from '../types/user';
import { convertLegacyRole } from './roleUtils';

const convertStatus = (status: string): UserStatus => {
  if (status === 'actif') return 'active';
  if (status === 'archivé') return 'archived';
  if (status === 'inactif') return 'inactive';
  if (status === 'suspendu') return 'suspended';
  return status as UserStatus;
};

export const userService = {
  async getAllUsers(): Promise<User[]> {
    console.log('Getting all users...');
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        ...data, 
        role: convertLegacyRole(data.role),
        status: convertStatus(data.status),
        uid: doc.id 
      } as User;
    });
    console.log('Retrieved users:', users);
    return users;
  },

  async archiveUser(userId: string): Promise<void> {
    console.log('Archiving user:', userId);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'archived',
      updatedAt: new Date().toISOString()
    });
    console.log('User archived successfully');
  },

  async reactivateUser(userId: string): Promise<void> {
    console.log('Reactivating user:', userId);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'active',
      updatedAt: new Date().toISOString()
    });
    console.log('User reactivated successfully');
  },

  async deleteUser(userId: string): Promise<void> {
    console.log('Deleting user:', userId);
    // 1. Get all subcollections for this user
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      throw new Error('User not found');
    }

    try {
      // 2. Delete all exercises
      console.log('Deleting user exercises...');
      const exercisesRef = collection(db, `users/${userId}/exercises`);
      const exercisesSnapshot = await getDocs(exercisesRef);
      
      // Delete each exercise document
      for (const exerciseDoc of exercisesSnapshot.docs) {
        await deleteDoc(doc(db, `users/${userId}/exercises/${exerciseDoc.id}`));
      }

      // 3. Delete the user document itself
      console.log('Deleting user document...');
      await deleteDoc(userRef);

      // 4. Delete the user's Firebase Auth account
      // Note: This will only work if the user is currently signed in
      // For admin operations, you would need to use the Admin SDK
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === userId) {
        await deleteAuthUser(currentUser);
      } else {
        console.warn('Could not delete Firebase Auth account - user not currently signed in');
      }

      console.log('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
};
