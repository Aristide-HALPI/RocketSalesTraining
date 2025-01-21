import { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { EvaluationWorkflow } from '../types/evaluation';

interface ExerciseSettings {
  id: string;
  type: string;
  name: string;
  workflow: EvaluationWorkflow;
}

const defaultSettings: ExerciseSettings[] = [
  { id: 'goalkeeper', type: 'goalkeeper', name: 'Exercice Goalkeeper', workflow: 'ai_with_review' },
  { id: 'eisenhower', type: 'eisenhower', name: 'Exercice Eisenhower', workflow: 'auto_correction' },
  { id: 'welcome', type: 'welcome', name: 'Exercice de bienvenue', workflow: 'manual' }
];

export default function EvaluationSettings() {
  const [exercises, setExercises] = useState<ExerciseSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = collection(db, 'evaluationSettings');
        const snapshot = await getDocs(settingsRef);
        const settings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ExerciseSettings[];

        // Si aucun paramètre n'existe, créer les paramètres par défaut
        if (settings.length === 0) {
          await Promise.all(defaultSettings.map(async (setting) => {
            const docRef = doc(db, 'evaluationSettings', setting.id);
            await setDoc(docRef, {
              type: setting.type,
              name: setting.name,
              workflow: setting.workflow
            });
          }));
          setExercises(defaultSettings);
        } else {
          setExercises(settings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Erreur lors du chargement des paramètres');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleWorkflowChange = async (exerciseId: string, workflow: EvaluationWorkflow) => {
    try {
      setSaving(true);
      // Mettre à jour en base de données
      const docRef = doc(db, 'evaluationSettings', exerciseId);
      await setDoc(docRef, {
        workflow
      }, { merge: true });
      
      // Mettre à jour l'état local
      setExercises(prev => prev.map(ex => 
        ex.id === exerciseId ? { ...ex, workflow } : ex
      ));
      
      toast.success('Paramètres mis à jour avec succès');
    } catch (error) {
      console.error('Error updating workflow:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'formateur')) {
    return <div className="p-4">Accès non autorisé</div>;
  }

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">Paramètres d'évaluation des exercices</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{exercise.name}</h3>
                  <p className="text-sm text-gray-500">Type: {exercise.type}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <select
                    value={exercise.workflow}
                    onChange={(e) => handleWorkflowChange(exercise.id, e.target.value as EvaluationWorkflow)}
                    disabled={saving}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="manual">Correction manuelle uniquement</option>
                    <option value="auto_correction">Correction automatique</option>
                    <option value="ai_with_review">IA + Revue formateur</option>
                    <option value="ai_auto_publish">IA auto-publication</option>
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 bg-gray-50 p-4 rounded-md">
        <h2 className="text-lg font-medium mb-2">Légende des modes d'évaluation :</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li><strong>Correction manuelle uniquement :</strong> Les exercices seront évalués uniquement par les formateurs</li>
          <li><strong>Correction automatique :</strong> Les exercices sont corrigés et publiés automatiquement selon des critères prédéfinis</li>
          <li><strong>IA + Revue formateur :</strong> L'IA évalue d'abord, puis le formateur revoit et valide</li>
          <li><strong>IA auto-publication :</strong> L'IA évalue et publie automatiquement les résultats</li>
        </ul>
      </div>
    </div>
  );
}
