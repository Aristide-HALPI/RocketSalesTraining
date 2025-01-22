import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const onDeleteUser = functions.firestore
  .document('users/{userId}')
  .onDelete(async (snap, context) => {
    const userId = context.params.userId;
    
    try {
      // Supprimer le compte Firebase Auth
      await admin.auth().deleteUser(userId);
      console.log(`Successfully deleted auth user: ${userId}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`Auth user already deleted or not found: ${userId}`);
      } else {
        console.error(`Error deleting auth user: ${userId}`, error);
        throw error;
      }
    }
  });
