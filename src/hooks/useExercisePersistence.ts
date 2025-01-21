import { useState, useEffect } from 'react';

export function useExercisePersistence(exerciseId: string) {
  const [draftData, setDraftData] = useState<any>(null);

  useEffect(() => {
    const savedData = localStorage.getItem(`exercise_draft_${exerciseId}`);
    if (savedData) {
      try {
        setDraftData(JSON.parse(savedData));
      } catch (error) {
        console.error('Error parsing saved draft:', error);
      }
    }
  }, [exerciseId]);

  const saveDraft = (data: any) => {
    try {
      localStorage.setItem(`exercise_draft_${exerciseId}`, JSON.stringify(data));
      setDraftData(data);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(`exercise_draft_${exerciseId}`);
    setDraftData(null);
  };

  return { draftData, saveDraft, clearDraft };
}
