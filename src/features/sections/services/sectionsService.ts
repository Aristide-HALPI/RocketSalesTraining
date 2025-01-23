import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AIEvaluationResponse } from '../../../services/AIService';

export type SectionType = 'motivateurs' | 'caracteristiques' | 'concepts';

export interface Section {
  id: string;
  title: string;
  description: string;
  type: SectionType;
  answers: {
    text: string;
    feedback?: string;
    score?: number;
  }[];
}

export interface SectionsExercise {
  id: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated' | 'pending_validation';
  sections: Section[];
  totalScore?: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string;
  aiEvaluation?: AIEvaluationResponse;
  evaluatedAt?: string;
  evaluatedBy?: string;
  submittedAt?: string;
}

// Configuration des sections de l'exercice
export const SECTIONS_CONFIG: { id: SectionType; title: string; maxAnswers: number; description: string }[] = [
  {
    id: 'motivateurs',
    title: 'A. QUESTION IRRÉSISTIBLE au décideur',
    maxAnswers: 5,
    description: 'Choisissez la fonction par excellence par rapport à votre solution'
  },
  {
    id: 'caracteristiques',
    title: 'B. CARACTÉRISTIQUES UNIQUES de vente',
    maxAnswers: 5,
    description: 'Listez les caractéristiques qui différencient votre solution'
  },
  {
    id: 'concepts',
    title: 'C. CONCEPTS UNIQUES de vente',
    maxAnswers: 2,
    description: 'Définissez les concepts clés qui rendent votre solution unique'
  }
];

function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

export const sectionsService = {
  async getExercise(userId: string): Promise<SectionsExercise | null> {
    console.log('Loading sections exercise for user:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
    
    try {
      const exerciseDoc = await getDoc(exerciseRef);
      console.log('Exercise doc exists:', exerciseDoc.exists(), 'Data:', exerciseDoc.data());

      if (!exerciseDoc.exists()) {
        // Créer un nouvel exercice si aucun n'existe
        const initialExercise: SectionsExercise = {
          id: userId,
          userId,
          status: 'in_progress',
          sections: SECTIONS_CONFIG.map(section => ({
            id: section.id,
            title: section.title,
            description: section.description,
            type: section.id as SectionType,
            answers: Array(section.maxAnswers).fill({
              text: '',
              feedback: '',
              score: 0
            })
          })),
          maxScore: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        await setDoc(exerciseRef, cleanUndefined(initialExercise));
        return initialExercise;
      }

      const exerciseData = exerciseDoc.data() as SectionsExercise;
      return {
        ...exerciseData,
        sections: SECTIONS_CONFIG.map((config, index) => ({
          ...config,
          type: config.id as SectionType,
          answers: exerciseData.sections[index]?.answers || 
            Array(config.maxAnswers).fill({ text: '', feedback: '', score: 0 })
        }))
      };
    } catch (error) {
      console.error('Error getting sections exercise:', error);
      return null;
    }
  },

  subscribeToExercise(userId: string, onChange: (exercise: SectionsExercise) => void) {
    const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
    
    return onSnapshot(exerciseRef, (doc) => {
      if (doc.exists()) {
        const exerciseData = doc.data() as SectionsExercise;
        onChange({
          ...exerciseData,
          sections: SECTIONS_CONFIG.map((config, index) => ({
            ...config,
            type: config.id as SectionType,
            answers: exerciseData.sections[index]?.answers || 
              Array(config.maxAnswers).fill({ text: '', feedback: '', score: 0 })
          }))
        });
      }
    });
  },

  async updateExercise(userId: string, updates: Partial<SectionsExercise>) {
    console.log('Updating sections exercise for user:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
    
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      await updateDoc(exerciseRef, cleanUndefined(updateData));
    } catch (error) {
      console.error('Error updating sections exercise:', error);
      throw error;
    }
  },

  async submitExercise(userId: string) {
    console.log('Submitting sections exercise for user:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
    
    try {
      const submissionTime = new Date().toISOString();
      
      // Mettre à jour l'exercice avec le nouveau statut
      await updateDoc(exerciseRef, {
        status: 'pending_validation',
        submittedAt: submissionTime,
        updatedAt: submissionTime,
        lastUpdated: submissionTime
      });

    } catch (error) {
      console.error('Error submitting sections exercise:', error);
      throw error;
    }
  },

  async evaluateExercise(userId: string, sections: SectionsExercise['sections'], evaluatorId: string) {
    console.log('Evaluating sections exercise for user:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
    
    try {
      const evaluationTime = new Date().toISOString();
      await updateDoc(exerciseRef, cleanUndefined({
        sections,
        status: 'evaluated',
        evaluatedAt: evaluationTime,
        evaluatedBy: evaluatorId,
        updatedAt: evaluationTime,
        lastUpdated: evaluationTime
      }));
    } catch (error) {
      console.error('Error evaluating sections exercise:', error);
      throw error;
    }
  },

  async updateAIEvaluation(userId: string, aiEvaluation: AIEvaluationResponse) {
    console.log('Updating AI evaluation for user:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
    
    try {
      const updateTime = new Date().toISOString();
      await updateDoc(exerciseRef, {
        aiEvaluation,
        updatedAt: updateTime,
        lastUpdated: updateTime
      });
    } catch (error) {
      console.error('Error updating AI evaluation:', error);
      throw error;
    }
  }
};
