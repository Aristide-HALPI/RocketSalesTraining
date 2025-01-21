import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { SystemSettings } from '../types/database';

export async function initializeSystemSettings() {
  const settingsRef = doc(db, 'Settings', 'system');
  const settingsDoc = await getDoc(settingsRef);

  if (!settingsDoc.exists()) {
    const initialSettings: SystemSettings = {
      registration: {
        enabled: true,
        trainerCodeRequired: true,
        trainerCode: 'ROCKET2025', // À changer en production
        autoApprove: false
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      }
    };

    await setDoc(settingsRef, initialSettings);
    console.log('System settings initialized');
  }
}

// Fonction pour mettre à jour le code formateur
export async function updateTrainerCode(newCode: string, updatedBy: string) {
  const settingsRef = doc(db, 'Settings', 'system');
  const settingsDoc = await getDoc(settingsRef);

  if (settingsDoc.exists()) {
    const currentSettings = settingsDoc.data() as SystemSettings;
    
    await setDoc(settingsRef, {
      ...currentSettings,
      registration: {
        ...currentSettings.registration,
        trainerCode: newCode
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        updatedBy
      }
    });
    
    console.log('Trainer code updated');
  }
}

// Fonction pour activer/désactiver les inscriptions
export async function toggleRegistration(enabled: boolean, updatedBy: string) {
  const settingsRef = doc(db, 'Settings', 'system');
  const settingsDoc = await getDoc(settingsRef);

  if (settingsDoc.exists()) {
    const currentSettings = settingsDoc.data() as SystemSettings;
    
    await setDoc(settingsRef, {
      ...currentSettings,
      registration: {
        ...currentSettings.registration,
        enabled
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        updatedBy
      }
    });
    
    console.log(`Registration ${enabled ? 'enabled' : 'disabled'}`);
  }
}
