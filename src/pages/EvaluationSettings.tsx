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
  { id: 'welcome', type: 'welcome', name: 'Exercice de bienvenue', workflow: 'manual' },
  { id: 'solution', type: 'solution', name: 'Votre Solution', workflow: 'manual' },
  { id: 'eisenhower', type: 'eisenhower', name: 'Exercice Eisenhower', workflow: 'auto_correction' },
  { id: 'goalkeeper', type: 'goalkeeper', name: 'Exercice Goalkeeper', workflow: 'ai_manual_with_review' },
  { id: 'sections', type: 'sections', name: 'Les 3 sections', workflow: 'ai_manual_with_review' },
  { id: 'rdv_decideur', type: 'rdv_decideur', name: 'RDV avec le Décideur', workflow: 'manual' },
  { id: 'iiep', type: 'iiep', name: '(s\')IIEP', workflow: 'manual' },
  { id: 'presentation', type: 'presentation', name: 'Présentation de votre société', workflow: 'manual' },
  { id: 'eombus', type: 'eombus', name: 'EOMBUS', workflow: 'manual' },
  { id: 'cles', type: 'cles', name: 'Les clés', workflow: 'manual' },
  { id: 'cdab', type: 'cdab', name: 'CDAB', workflow: 'manual' },
  { id: 'outil_cdab', type: 'outil_cdab', name: 'Outil CDAB', workflow: 'manual' },
  { id: 'objections', type: 'objections', name: 'Objections', workflow: 'manual' },
  { id: 'points_bonus', type: 'points_bonus', name: 'Points Bonus', workflow: 'manual' },
  { id: 'points_role_final', type: 'points_role_final', name: 'Points Rôle Final', workflow: 'manual' },
  { id: 'certification', type: 'certification', name: 'Certification', workflow: 'manual' }
];

export default function EvaluationSettings() {
  const [exercises, setExercises] = useState<ExerciseSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const workflowOptions = [
    { value: 'manual', label: 'Évaluation manuelle uniquement' },
    { value: 'ai_manual_with_review', label: 'IA + Révision formateur' },
    { value: 'ai_with_review', label: 'IA + Validation formateur' },
    { value: 'ai_auto_publish', label: 'Publication automatique IA' },
    { value: 'auto_correction', label: 'Auto-correction' }
  ];

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = collection(db, 'evaluationSettings');
        const snapshot = await getDocs(settingsRef);
        const existingSettings = snapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          acc[doc.id] = {
            id: doc.id,
            type: data.type as string,
            name: data.name as string,
            workflow: data.workflow as EvaluationWorkflow
          };
          return acc;
        }, {} as Record<string, ExerciseSettings>);

        // Fusionner les paramètres existants avec les paramètres par défaut
        const mergedSettings = defaultSettings.map(defaultSetting => ({
          ...defaultSetting,
          ...existingSettings[defaultSetting.id]
        }));

        // Mettre à jour ou créer les paramètres manquants dans la base de données
        await Promise.all(mergedSettings.map(async (setting) => {
          if (!existingSettings[setting.id]) {
            const docRef = doc(db, 'evaluationSettings', setting.id);
            await setDoc(docRef, {
              type: setting.type,
              name: setting.name,
              workflow: setting.workflow
            });
          }
        }));

        setExercises(mergedSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Erreur lors du chargement des paramètres');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleWorkflowChange = async (exerciseId: string, newWorkflow: EvaluationWorkflow) => {
    try {
      setSaving(true);
      // Mettre à jour en base de données
      const docRef = doc(db, 'evaluationSettings', exerciseId);
      await setDoc(docRef, {
        workflow: newWorkflow
      }, { merge: true });
      
      // Mettre à jour l'état local
      setExercises(prev => prev.map(ex => 
        ex.id === exerciseId ? { ...ex, workflow: newWorkflow } : ex
      ));
      
      toast.success('Paramètres mis à jour avec succès');
    } catch (error) {
      console.error('Error updating workflow:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'trainer')) {
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
                  <p className="text-sm text-gray-500">Type : {exercise.type}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <select
                    value={exercise.workflow}
                    onChange={(e) => handleWorkflowChange(exercise.id, e.target.value as EvaluationWorkflow)}
                    disabled={saving}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    {workflowOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
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
          <li><strong>Évaluation manuelle uniquement :</strong> Les exercices seront évalués uniquement par les formateurs</li>
          <li><strong>Auto-correction :</strong> Correction et publication automatiques sans IA ni formateur</li>
          <li><strong>IA + Validation formateur :</strong> L'IA évalue d'abord, puis le formateur révise et valide</li>
          <li><strong>IA + Révision formateur :</strong> L'IA évalue manuellement, puis le formateur révise et valide</li>
          <li><strong>Publication automatique IA :</strong> L'IA évalue et publie automatiquement les résultats</li>
        </ul>
      </div>
    </div>
  );
}
