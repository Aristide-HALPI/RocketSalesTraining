import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ExerciseStatus } from '../../../types/database';
import { AIService } from '../../../services/AIService';
import { AIEvaluationResponse } from '../../../api/ai/routes/evaluation';

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

export interface IIEPService {
  getExercise(userId: string): Promise<IIEPExercise | null>;
  createExercise(userId: string): Promise<IIEPExercise>;
  updateExercise(userId: string, exercise: Partial<IIEPExercise>): Promise<void>;
  submitExercise(userId: string, exercise: IIEPExercise): Promise<void>;
  evaluateExercise(userId: string, exercise: IIEPExercise, evaluatorId?: string): Promise<void>;
  subscribeToExercise(userId: string, callback: (exercise: IIEPExercise) => void): () => void;
  evaluateWithAI(userId: string): Promise<void>;
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

class IIEPServiceImpl implements IIEPService {
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
      await updateDoc(doc(db, exercisePath), exercise);
    } catch (error) {
      console.error('Error updating IIEP exercise:', error);
      throw error;
    }
  }

  async submitExercise(userId: string, exercise: IIEPExercise): Promise<void> {
    try {
      await this.updateExercise(userId, {
        ...exercise,
        status: 'submitted',
        submittedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error submitting exercise:', error);
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

  subscribeToExercise(userId: string, callback: (exercise: IIEPExercise) => void): () => void {
    if (!userId) return () => {};

    const docRef = doc(db, this.getExercisePath(userId));
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as IIEPExercise);
      }
    });
  }

  async evaluateWithAI(userId: string): Promise<void> {
    try {
      const exerciseDoc = await getDoc(doc(db, this.getExercisePath(userId)));
      if (!exerciseDoc.exists()) {
        throw new Error('Exercise not found');
      }

      const exercise = exerciseDoc.data() as IIEPExercise;
      
      // Formater le contenu pour l'évaluation
      const formattedContent = {
        type: 'iiep',
        exercise: {
          sections: exercise.sections.map(section => ({
            id: section.id,
            title: section.title,
            dialogues: section.dialogues
          }))
        }
      };

      // Utiliser evaluateExercise
      const evaluation: AIEvaluationResponse = await AIService.evaluateExercise({
        type: 'iiep',
        content: JSON.stringify(formattedContent),
        organizationId: '01930c32-cb5d-78be-be04-a36683d5fe99', // ID par défaut
        botId: import.meta.env.VITE_SIIEP_BOT_ID // Utiliser le même bot que SIIEP
      });

      console.log('Raw evaluation object:', evaluation);
      console.log('Raw evaluation JSON:', JSON.stringify(evaluation));

      // Extraire les réponses du JSON si nécessaire
      let responses = evaluation.responses;
      let finalScore = evaluation.score || 0;

      if (typeof evaluation === 'string') {
        try {
          const parsed = JSON.parse(evaluation);
          responses = parsed.responses;
          finalScore = parsed.score || 0;
          console.log('Parsed from string:', { responses, finalScore });
        } catch (e) {
          console.error('Error parsing evaluation:', e);
          responses = [];
        }
      } else if (evaluation.evaluation) {
        // Si le score n'est pas directement dans l'objet, essayer de le trouver dans evaluation.evaluation
        responses = evaluation.evaluation.responses;
        if (!finalScore && evaluation.evaluation.score) {
          finalScore = evaluation.evaluation.score;
        }
        console.log('Score from evaluation:', finalScore);
      }

      // Si responses est toujours undefined, essayer d'extraire de evaluation.evaluation
      if (!responses && evaluation.evaluation?.responses) {
        responses = evaluation.evaluation.responses;
      }

      // S'assurer que responses est un tableau
      responses = responses || [];
      
      console.log('Final responses to process:', responses);
      console.log('Final score to use:', finalScore);

      // Transformer les réponses de l'IA
      const transformedResponses = responses.map(r => {
        const transformed = {
          objection: parseInt(r.objection?.toString() || r.characteristic?.toString() || '0'),
          category: (r.stage || r.section || '')
            .toLowerCase()
            .replace(/[()'']/g, '')
            .replace('sinterroger', 'interroger'),
          score: r.score || 0,
          maxPoints: r.maxPoints || 4,
          comment: r.comment || ''
        };
        console.log('Transformed response:', transformed);
        return transformed;
      });

      console.log('All transformed responses:', transformedResponses);

      // Si le score final est toujours 0, essayons de le calculer
      if (finalScore === 0) {
        const totalPoints = transformedResponses.reduce((sum, r) => sum + r.score, 0);
        const maxPoints = transformedResponses.reduce((sum, r) => sum + r.maxPoints, 0) || 1;
        finalScore = Math.round((totalPoints / maxPoints) * 30);
        console.log('Calculated fallback score:', { totalPoints, maxPoints, finalScore });
      }

      // Mettre à jour l'exercice avec les scores et commentaires
      const updatedExercise = {
        ...exercise,
        status: 'evaluated' as const,
        totalScore: finalScore,
        maxScore: 30,
        evaluation: {
          score: finalScore,
          comment: evaluation.feedback || '',
          evaluatedAt: new Date().toISOString(),
          evaluatedBy: 'AI'
        }
      };

      // Mettre à jour chaque section et dialogue
      updatedExercise.sections = exercise.sections.map(section => {
        const sectionId = parseInt(section.id);
        console.log('\n=== Processing section ===', { 
          sectionId, 
          title: section.title,
          dialoguesCount: section.dialogues.length 
        });
        
        // Mettre à jour les dialogues
        const updatedDialogues = section.dialogues.map((dialogue, index) => {
          // Ne pas noter les dialogues du client
          if (dialogue.type === 'client') {
            console.log('Skipping client dialogue:', { index, category: dialogue.category });
            return dialogue;
          }

          // Trouver la réponse de l'IA pour cette objection et catégorie
          console.log('\nLooking for response:', { 
            sectionId, 
            dialogueCategory: dialogue.category,
            dialogueType: dialogue.type,
            dialogueIndex: index
          });

          const matchingResponses = transformedResponses.filter(
            r => r.objection === sectionId && r.category === dialogue.category
          );

          console.log('Found matching responses:', matchingResponses);

          const response = matchingResponses[0];

          if (!response) {
            console.log('No response found for dialogue');
            return dialogue;
          }

          const updatedDialogue = {
            ...dialogue,
            score: response.score,
            feedback: response.comment
          };
          
          console.log('Updated dialogue:', {
            category: updatedDialogue.category,
            type: updatedDialogue.type,
            score: updatedDialogue.score,
            feedback: updatedDialogue.feedback
          });
          
          return updatedDialogue;
        });

        return {
          ...section,
          dialogues: updatedDialogues
        };
      });

      console.log('Final exercise state:', {
        totalScore: updatedExercise.totalScore,
        status: updatedExercise.status,
        evaluation: updatedExercise.evaluation
      });

      // Mettre à jour l'exercice en une seule opération
      await setDoc(doc(db, this.getExercisePath(userId)), updatedExercise);
    } catch (error) {
      console.error('Error evaluating exercise with AI:', error);
      throw error;
    }
  }
}

export const iiepService: IIEPService = new IIEPServiceImpl();
