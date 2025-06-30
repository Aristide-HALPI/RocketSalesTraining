import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { evaluateExercise, AIEvaluationResponse } from '../../../api/ai/routes/evaluation';
import { ExerciseStatus } from '../../../types/exercises';

export type SectionType = 'text' | 'motivateurs' | 'caracteristiques' | 'concepts';

export interface Section {
  id: string;
  title: string;
  type: SectionType;
  description: string;
  answers: Array<{
    text: string;
    score: number;
    feedback: string;
  }>;
}

export interface SectionsExercise {
  id: string;
  userId: string;
  status: ExerciseStatus;
  sections: Section[];
  maxScore: number;
  totalScore?: number;
  createdAt: string;
  updatedAt: string;
  lastUpdated: string;
  evaluatedAt?: string;
  evaluatedBy?: string;
  submittedAt?: string;
}

interface AIEvaluationSectionsResponse {
  sections: {
    id: string;
    title: string;
    type: string;
    description: string;
    answers: {
      text: string;
      score: number;
      feedback: string;
    }[];
  }[];
}

function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

function processAIFeedback(feedback: string | AIEvaluationResponse): AIEvaluationSectionsResponse {
  let parsedFeedback: AIEvaluationResponse;
  
  if (typeof feedback === 'string') {
    try {
      // Strip out markdown code block markers if present
      const cleanedFeedback = feedback.replace(/^```json\n|\n```$/g, '').trim();
      parsedFeedback = JSON.parse(cleanedFeedback);
    } catch (e) {
      console.error("Failed to parse AI feedback JSON:", e);
      throw new Error("Invalid AI response format");
    }
  } else {
    parsedFeedback = feedback;
  }

  console.log("Parsed feedback:", parsedFeedback);

  // Vérifier que la structure est valide
  if (!parsedFeedback.sections || !Array.isArray(parsedFeedback.sections)) {
    throw new Error("Invalid AI response format: missing sections array");
  }

  // Vérifier que toutes les sections requises sont présentes
  const requiredSections = ['motivateurs', 'caracteristiques', 'concepts'];
  const missingSections = requiredSections.filter(id => 
    !parsedFeedback.sections!.find((s) => s.id === id)
  );

  if (missingSections.length > 0) {
    throw new Error(`Missing required sections: ${missingSections.join(', ')}`);
  }

  // À ce point, on sait que sections existe et est un tableau
  return { sections: parsedFeedback.sections as NonNullable<typeof parsedFeedback.sections> };
}

// Configuration des sections de l'exercice
export const SECTIONS_CONFIG: { id: string; title: string; maxAnswers: number; description: string; maxPointsPerAnswer: number }[] = [
  {
    id: 'motivateurs',
    title: 'A. QUESTIONS IRRESISTIBLES',
    maxAnswers: 5,
    description: 'Identifiez les motivateurs d\'achat',
    maxPointsPerAnswer: 4
  },
  {
    id: 'caracteristiques',
    title: 'B. CARACTERISTIQUES UNIQUES de vente',
    maxAnswers: 5,
    description: 'Identifiez les caractéristiques qui rendent votre solution unique',
    maxPointsPerAnswer: 4
  },
  {
    id: 'concepts',
    title: 'C. CONCEPTS UNIQUES de vente',
    maxAnswers: 2,
    description: 'Identifiez les concepts qui rendent votre solution unique',
    maxPointsPerAnswer: 4
  }
];

// Calcul du score maximum total
export const MAX_SCORE = SECTIONS_CONFIG.reduce((total, section) => {
  return total + (section.maxAnswers * section.maxPointsPerAnswer);
}, 0);

export const sectionsService = {
  async createExercise(userId: string): Promise<SectionsExercise> {
    const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
    
    // Créer un nouvel exercice avec la structure par défaut
    const initialExercise: SectionsExercise = {
      id: exerciseRef.id,
      userId,
      status: ExerciseStatus.InProgress,
      sections: SECTIONS_CONFIG.map(config => ({
        id: config.id,
        title: config.title,
        type: config.id as SectionType,
        description: config.description,
        answers: Array.from({ length: config.maxAnswers }, () => ({
          text: '',
          score: 0,
          feedback: ''
        }))
      })),
      maxScore: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    try {
      await setDoc(exerciseRef, cleanUndefined(initialExercise));
      return initialExercise;
    } catch (error) {
      console.error('Error creating exercise:', error);
      throw error;
    }
  },

  async getExercise(userId: string): Promise<SectionsExercise | null> {
    if (!userId) {
      console.log('No user ID provided');
      return null;
    }

    const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
    
    try {
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        // Créer un nouvel exercice avec la structure par défaut
        const newExercise: SectionsExercise = {
          id: exerciseRef.id,
          userId,
          status: ExerciseStatus.InProgress,
          maxScore: 30,
          sections: SECTIONS_CONFIG.map(config => ({
            id: config.id,
            title: config.title,
            type: config.id as SectionType,
            description: config.description,
            answers: Array.from({ length: config.maxAnswers }, () => ({
              text: '',
              score: 0,
              feedback: ''
            }))
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        await setDoc(exerciseRef, cleanUndefined(newExercise));
        return newExercise;
      }

      return exerciseDoc.data() as SectionsExercise;
    } catch (error) {
      console.error('Error getting exercise:', error);
      throw error;
    }
  },

  async submitExercise(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
      await updateDoc(exerciseRef, {
        status: ExerciseStatus.Submitted,
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error submitting exercise:', error);
      throw error;
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

  async updateExercise(userId: string, exercise: Partial<SectionsExercise>): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
      const updatedExercise = {
        ...exercise,
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      await updateDoc(exerciseRef, cleanUndefined(updatedExercise));
    } catch (error) {
      console.error('Error updating exercise:', error);
      throw error;
    }
  },

  async evaluateExercise(userId: string, sections: SectionsExercise['sections'], evaluatorId: string): Promise<void> {
    try {
      const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
      await updateDoc(exerciseRef, {
        sections,
        status: ExerciseStatus.Evaluated,
        evaluatorId,
        evaluatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error evaluating exercise:', error);
      throw error;
    }
  },

  async evaluateWithAI(userId: string, organizationId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const exercise = await this.getExercise(userId);
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      // Formater les sections pour l'IA
      const formattedContent = {
        type: 'sections',
        exercise: {
          sections: exercise.sections.map(section => ({
            id: section.id,
            title: section.title,
            type: section.type,
            description: section.description,
            answers: section.answers.map(answer => ({
              text: answer.text
            }))
          }))
        }
      };

      console.log('Formatted content:', formattedContent);

      // Utiliser le bot ID spécifique pour l'exercice des sections
      const response = await evaluateExercise(
        organizationId, 
        JSON.stringify(formattedContent), 
        'sections'
      );
      
      // Process the AI feedback
      const processedFeedback = processAIFeedback(response);

      // Merge the original texts with AI feedback
      const mergedSections = processedFeedback.sections.map(section => ({
        ...section,
        type: section.type as SectionType
      }));

      // Calculer le score total sur 48
      const rawScore = mergedSections.reduce((total, section) => {
        return total + section.answers.reduce((sectionTotal, answer) => {
          return sectionTotal + (answer.score || 0);
        }, 0);
      }, 0);

      // Convertir le score sur 30 avec une règle de trois
      const totalScore = Math.round((rawScore * 30) / MAX_SCORE);

      console.log('Raw score (sur 48):', rawScore);
      console.log('Total score (sur 30):', totalScore);

      // Mettre à jour l'exercice avec les résultats de l'IA
      const exerciseRef = doc(db, `users/${userId}/exercises/sections`);
      await updateDoc(exerciseRef, {
        sections: mergedSections,
        status: ExerciseStatus.Evaluated,
        totalScore: totalScore,
        maxScore: 30,
        evaluatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error evaluating exercise with AI:', error);
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
  },

  async resetExercise(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const exerciseRef = doc(db, `users/${userId}/exercises/sections`);

      // Créer un nouvel exercice avec la structure par défaut
      const newExercise: Partial<SectionsExercise> = {
        status: ExerciseStatus.InProgress,
        sections: SECTIONS_CONFIG.map(config => ({
          id: config.id,
          title: config.title,
          type: config.id as SectionType,
          description: config.description,
          answers: Array.from({ length: config.maxAnswers }, () => ({
            text: '',
            score: 0,
            feedback: ''
          }))
        })),
        maxScore: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      await updateDoc(exerciseRef, cleanUndefined(newExercise));
    } catch (error) {
      console.error('Error resetting exercise:', error);
      throw error;
    }
  },
};
