import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { SystemSettings } from '../types/database';

export async function initializeSystemSettings() {
  const systemSettings: SystemSettings = {
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
    console.log('Paramètres système initialisés avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des paramètres système:', error);
    return false;
  }
}
