import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { SystemSettings } from '../types/database';

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'system'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as SystemSettings);
        } else {
          setError('Paramètres système non trouvés');
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
