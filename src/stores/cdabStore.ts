import { create } from 'zustand';
import type { CdabExercise } from '../features/cdab/services/cdabService';
import type { OutilsCdabExercise } from '../features/outilscdab/services/outilsCdabService';

interface CdabStore {
  currentExercise: CdabExercise | null;
  outilsExercise: OutilsCdabExercise | null;
  hasUnsavedChanges: boolean;
  updateExercise: (exercise: CdabExercise) => void;
  updateOutilsExercise: (exercise: OutilsCdabExercise) => void;
  syncOutilsWithCdab: (userId: string) => void;
  setHasUnsavedChanges: (value: boolean) => void;
}

export const useCdabStore = create<CdabStore>((set, get) => ({
  currentExercise: null,
  outilsExercise: null,
  hasUnsavedChanges: false,
  updateExercise: (exercise) => {
    set({ currentExercise: exercise });
  },
  updateOutilsExercise: (exercise) => {
    set({ outilsExercise: exercise });
  },
  syncOutilsWithCdab: (userId) => {
    const state = get();
    if (!state.currentExercise || !state.outilsExercise) return;

    const updatedOutilsExercise = {
      ...state.outilsExercise,
      solution: state.currentExercise.characteristics.map((char, index) => ({
        ...state.outilsExercise!.solution[index],
        characteristic: char.description || '',
        definition: char.definition || '',
        advantages: char.advantages || '',
        benefits: char.benefits || '',
        proofs: char.proofs || ''
      })),
      qualification: state.currentExercise.characteristics.map((char, index) => ({
        ...state.outilsExercise!.qualification[index],
        problems: char.problems || '',
        problemImpact: char.impact || '',
        clientConfirmation: char.confirmation || '',
        acceptedBenefit: char.benefit || ''
      }))
    };

    const hasChanges = JSON.stringify(updatedOutilsExercise) !== JSON.stringify(state.outilsExercise);
    if (hasChanges) {
      set({ outilsExercise: updatedOutilsExercise, hasUnsavedChanges: true });
    }
  },
  setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value })
}));
