import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ExerciseStatus } from '../../../types/database';
import { AIService } from '../../../services/AIService';

export interface IIEPDialogue {
  text: string;
  type: 'commercial' | 'client';
  category: 'interroger' | 'investiguer' | 'empathie' | 'proposer';
  score?: number;
  feedback?: string;
}

export interface IIEPSection {
  id: string;
  title: string;
  dialogues: IIEPDialogue[];
}

export interface IIEPExercise {
  id: string;
  userId: string;
  status: ExerciseStatus;
  sections: IIEPSection[];
  totalScore?: number;
  maxScore: number;
  startedAt: string;
  submittedAt?: string;
  evaluation?: {
    score: number;
    comment: string;
    evaluatedAt: string;
    evaluatedBy: string;
  };
}

export const getInitialIIEPExercise = (): Partial<IIEPExercise> => ({
  status: 'not_started',
  maxScore: 30,
  sections: [
    {
      id: '1',
      title: 'Cela ne vaut pas la peine de se voir. Votre société a quand même la réputation d\'être trop cher!',
      dialogues: [
        // (s')Interroger
        { category: 'interroger', type: 'commercial', text: '' },
        { category: 'interroger', type: 'client', text: '' },
        // Investiguer
        { category: 'investiguer', type: 'commercial', text: '' },
        { category: 'investiguer', type: 'client', text: '' },
        // Empathie
        { category: 'empathie', type: 'commercial', text: '' },
        // Proposer
        { category: 'proposer', type: 'commercial', text: '' },
        { category: 'proposer', type: 'client', text: '' },
      ]
    },
    {
      id: '2',
      title: 'Cela ne sert à rien de nous rencontrer: nous avons déjà des solutions!',
      dialogues: [
        // (s')Interroger
        { category: 'interroger', type: 'commercial', text: '' },
        { category: 'interroger', type: 'client', text: '' },
        // Investiguer
        { category: 'investiguer', type: 'commercial', text: '' },
        { category: 'investiguer', type: 'client', text: '' },
        // Empathie
        { category: 'empathie', type: 'commercial', text: '' },
        // Proposer
        { category: 'proposer', type: 'commercial', text: '' },
        { category: 'proposer', type: 'client', text: '' },
      ]
    },
    {
      id: '3',
      title: 'Retéléphonez-moi dans 1 an',
      dialogues: [
        // (s')Interroger
        { category: 'interroger', type: 'commercial', text: '' },
        { category: 'interroger', type: 'client', text: '' },
        // Investiguer
        { category: 'investiguer', type: 'commercial', text: '' },
        { category: 'investiguer', type: 'client', text: '' },
        // Empathie
        { category: 'empathie', type: 'commercial', text: '' },
        // Proposer
        { category: 'proposer', type: 'commercial', text: '' },
        { category: 'proposer', type: 'client', text: '' },
      ]
    }
  ]
});

class IIEPService {
  private getExercisePath(userId: string) {
    return `users/${userId}/exercises/iiep`;
  }

  async getExercise(userId: string): Promise<IIEPExercise | null> {
    try {
      const exerciseDoc = await getDoc(doc(db, this.getExercisePath(userId)));
      if (exerciseDoc.exists()) {
        return exerciseDoc.data() as IIEPExercise;
      }
      return null;
    } catch (error) {
      console.error('Error getting IIEP exercise:', error);
      throw error;
    }
  }

  async createExercise(userId: string): Promise<IIEPExercise> {
    try {
      const exercisePath = this.getExercisePath(userId);
      const initialExercise = getInitialIIEPExercise();
      initialExercise.id = 'iiep';
      initialExercise.userId = userId;
      initialExercise.startedAt = new Date().toISOString();

      await setDoc(doc(db, exercisePath), initialExercise);
      return initialExercise as IIEPExercise;
    } catch (error) {
      console.error('Error creating IIEP exercise:', error);
      throw error;
    }
  }

  async updateExercise(userId: string, exercise: Partial<IIEPExercise>): Promise<void> {
    try {
      const exercisePath = this.getExercisePath(userId);
      
      // Vérifier si l'exercice est vide
      const isExerciseEmpty = (exercise.sections || []).every(section =>
        section.dialogues.every(dialogue => !dialogue.text || dialogue.text.trim() === '')
      );

      // Mettre à jour le statut en fonction du contenu
      if (exercise.status !== 'submitted' && exercise.status !== 'evaluated') {
        exercise.status = isExerciseEmpty ? 'not_started' : 'in_progress';
      }

      await updateDoc(doc(db, exercisePath), exercise);
    } catch (error) {
      console.error('Error updating IIEP exercise:', error);
      throw error;
    }
  }

  async submitExercise(userId: string, exercise: IIEPExercise): Promise<void> {
    try {
      const exercisePath = this.getExercisePath(userId);
      
      // Calculer le score total (max 2 points par réponse du commercial)
      let totalRawScore = 0;
      let maxRawScore = 0;
      
      exercise.sections.forEach(section => {
        section.dialogues.forEach(dialogue => {
          if (dialogue.type === 'commercial') {
            const score = dialogue.score || 0;
            totalRawScore += score;
            maxRawScore += 2; // Max 2 points par réponse
          }
        });
      });

      // Convertir le score sur 30 points (règle de 3)
      const finalScore = Math.round((totalRawScore * 30) / maxRawScore);
      
      const updatedExercise = {
        ...exercise,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        totalScore: finalScore,
        maxScore: 30
      };

      await setDoc(doc(db, exercisePath), updatedExercise);
    } catch (error) {
      console.error('Error submitting exercise:', error);
      throw error;
    }
  }

  async evaluateWithAI(userId: string): Promise<void> {
    try {
      const exerciseDoc = await getDoc(doc(db, this.getExercisePath(userId)));
      if (!exerciseDoc.exists()) {
        throw new Error('Exercise not found');
      }

      const exercise = exerciseDoc.data() as IIEPExercise;
      
      // Appeler le service AI pour l'évaluation
      const evaluatedExercise = await AIService.evaluateIIEPExercise(exercise);
      
      // Mettre à jour l'exercice avec les résultats de l'IA
      await this.updateExercise(userId, {
        ...evaluatedExercise,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error evaluating exercise with AI:', error);
      throw error;
    }
  }

  async evaluateExercise(userId: string, exercise: IIEPExercise, evaluatorId?: string): Promise<void> {
    try {
      const updatedExercise = {
        ...exercise,
        status: 'evaluated' as const,
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: evaluatorId,
        updatedAt: new Date().toISOString()
      };

      await this.updateExercise(userId, updatedExercise);
    } catch (error) {
      console.error('Error evaluating exercise:', error);
      throw error;
    }
  }
}

export const iiepService = new IIEPService();
