import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { SystemSettings } from '../types/database';

const defaultSettings: SystemSettings = {
  registration: {
    enabled: true,
    trainerCodeRequired: true,
    trainerCode: 'TRAINER2024', // Code par défaut pour les formateurs
    autoApprove: false
  },
  metadata: {
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system' // UID du système
  }
};

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settingsRef = doc(db, 'settings', 'system');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as SystemSettings);
        } else {
          // Si les paramètres n'existent pas, les créer avec les valeurs par défaut
          await setDoc(settingsRef, defaultSettings);
          setSettings(defaultSettings);
        }
      } catch (err) {
        console.error('Error loading system settings:', err);
        setError('Erreur lors du chargement des paramètres système');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  return { settings, loading, error };
}
