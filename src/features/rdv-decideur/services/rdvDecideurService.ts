import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AIEvaluationResponse } from '../../../services/AIService';
import { AIService } from '@/services/AIService';

export type DialogueRole = 'commercial' | 'client';
export type Score = 0 | 1 | 2;

export interface DialogueEntry {
  role: DialogueRole;
  text: string;
  description?: string;
  feedback?: string;
  score?: Score;
  trainerComment?: string;
}

export interface RdvSection {
  id: string;
  title: string;
  description: string;
  dialogues: DialogueEntry[];
  trainerGeneralComment?: string;
}

export interface RdvDecideurExercise {
  id: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated' | 'pending_validation';
  sections: RdvSection[];
  totalScore?: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string;
  aiEvaluation?: AIEvaluationResponse;
  evaluatedAt?: string;
  evaluatedBy?: string;
  submittedAt?: string;
  trainerFinalComment?: string;
}

// Configuration des sections de l'exercice
export const SECTIONS_CONFIG = [
  {
    id: 'introduction',
    title: 'I. INTRODUCTION',
    description: 'Vérifiez votre contact, présentez-vous et montrez du respect pour le temps',
    dialogues: [
      { role: 'commercial' as DialogueRole, text: '', description: 'VÉRIFIEZ votre contact: son nom (si PAS encore donné) et son titre' },
      { role: 'client' as DialogueRole, text: '' },
      { role: 'commercial' as DialogueRole, text: '', description: 'PRÉSENTEZ-VOUS d\'une manière professionnelle: nom complet, nom de votre société et la spécialité de votre société' },
      { role: 'commercial' as DialogueRole, text: '', description: 'MONTREZ du respect pour le temps de votre interlocuteur' },
      { role: 'client' as DialogueRole, text: '' },
      { role: 'commercial' as DialogueRole, text: '' },
      { role: 'client' as DialogueRole, text: '' }
    ]
  },
  {
    id: 'premiere_accroche',
    title: 'II. PREMIÈRE ACCROCHE IRRÉSISTIBLE',
    description: 'FAITES une « Accroche Irrésistible » pour obtenir votre rendez-vous avec le décideur',
    dialogues: [
      { role: 'commercial' as DialogueRole, text: '', description: 'Question irrésistible (Motivateur fonctionnel du client)' },
      { role: 'client' as DialogueRole, text: '' },
      { role: 'commercial' as DialogueRole, text: '', description: 'Concept Unique de Vente (de votre solution)' },
      { role: 'commercial' as DialogueRole, text: '', description: 'Références clients irrésistibles' }
    ]
  },
  {
    id: 'proposition_rdv',
    title: 'III. PROPOSITION DE RENDEZ-VOUS',
    description: 'Utilisez la technique de l\'alternative',
    dialogues: [
      { role: 'commercial' as DialogueRole, text: '', description: 'Proposez le rendez vous avec une alternative' },
      { role: 'client' as DialogueRole, text: '' },
      { role: 'commercial' as DialogueRole, text: '', description: 'Il n\'oubliez pas de demander le numéro de Mobile et l\'adresse email du client' },
      { role: 'client' as DialogueRole, text: '' }
    ]
  },
  {
    id: 'deuxieme_accroche',
    title: 'IV. DEUXIÈME ACCROCHE IRRÉSISTIBLE',
    description: 'FAITES une « Accroche Irrésistible » pour obtenir votre rendez-vous avec le décideur',
    dialogues: [
      { role: 'commercial' as DialogueRole, text: '', description: 'Motivateur Personnel' },
      { role: 'client' as DialogueRole, text: '' },
      { role: 'commercial' as DialogueRole, text: '', description: 'Concept Unique de Vente' },
      { role: 'commercial' as DialogueRole, text: '', description: 'Référence client' }
    ]
  }
];

function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

// Calcule le score total en faisant une règle de trois
function calculateFinalScore(sections: RdvSection[]): number {
  const totalPoints = sections.reduce((total, section) => {
    return total + section.dialogues.reduce((sectionTotal, dialogue) => {
      // Ne compter que les réponses du commercial
      return sectionTotal + (dialogue.role === 'commercial' ? (dialogue.score || 0) : 0);
    }, 0);
  }, 0);

  // Nombre maximum de points possible (2 points par dialogue du commercial)
  const maxPossiblePoints = sections.reduce((total, section) => {
    return total + section.dialogues.filter(d => d.role === 'commercial').length * 2;
  }, 0);

  // Règle de trois pour avoir un score sur 40
  return Math.round((totalPoints * 40) / maxPossiblePoints);
}

// Vérifie si l'exercice est vide (aucune réponse saisie)
const isExerciseEmpty = (sections: RdvSection[]): boolean => {
  return sections.every(section => 
    section.dialogues.every(dialogue => !dialogue.text || dialogue.text.trim() === '')
  );
};

export const rdvDecideurService = {
  async getExercise(userId: string): Promise<RdvDecideurExercise> {
    const docRef = doc(db, `users/${userId}/exercises`, 'meeting');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as RdvDecideurExercise;
    }

    // Créer un nouvel exercice avec le statut initial 'not_started'
    const newExercise: RdvDecideurExercise = {
      id: 'meeting',
      userId,
      status: 'not_started',
      sections: SECTIONS_CONFIG,
      maxScore: 40,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, newExercise);
    return newExercise;
  },

  subscribeToExercise(userId: string, callback: (exercise: RdvDecideurExercise) => void) {
    const docRef = doc(db, `users/${userId}/exercises`, 'meeting');
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as RdvDecideurExercise);
      }
    });
  },

  async updateExercise(userId: string, updates: Partial<RdvDecideurExercise>) {
    const docRef = doc(db, `users/${userId}/exercises`, 'meeting');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Exercise not found');
    }

    const currentExercise = docSnap.data() as RdvDecideurExercise;
    const updatedExercise = { ...currentExercise, ...updates };

    // Mise à jour du statut en fonction du contenu
    if (updatedExercise.sections && updatedExercise.status !== 'evaluated' && updatedExercise.status !== 'submitted') {
      updatedExercise.status = isExerciseEmpty(updatedExercise.sections) ? 'not_started' : 'in_progress';
    }

    await updateDoc(docRef, cleanUndefined(updatedExercise));
  },

  async submitExercise(userId: string) {
    const docRef = doc(db, `users/${userId}/exercises`, 'meeting');
    const exercise = await this.getExercise(userId);
    
    try {
      await updateDoc(docRef, {
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error submitting rdv decideur exercise:', error);
      throw error;
    }
  },

  async evaluateExercise(userId: string, sections: RdvDecideurExercise['sections'], evaluatorId: string) {
    const docRef = doc(db, `users/${userId}/exercises`, 'meeting');
    
    try {
      const totalScore = calculateFinalScore(sections);
      const aiEvaluation = await AIService.evaluateExercise(sections);

      await updateDoc(docRef, {
        status: 'evaluated',
        sections,
        totalScore,
        aiEvaluation,
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: evaluatorId,
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error evaluating rdv decideur exercise:', error);
      throw error;
    }
  },

  async evaluateWithAI(userId: string): Promise<void> {
    const docRef = doc(db, `users/${userId}/exercises`, 'meeting');
    const exercise = await this.getExercise(userId);
    
    try {
      // Obtenir l'évaluation de l'IA
      const aiEvaluation = await AIService.evaluateExercise({
        type: 'rdv_decideur',
        sections: exercise.sections
      });

      // Mise à jour de l'exercice avec l'évaluation
      exercise.score = aiEvaluation.score;
      exercise.feedback = aiEvaluation.feedback;
      exercise.status = 'evaluated';
      exercise.evaluatedAt = new Date().toISOString();
      exercise.evaluatedBy = 'AI';
      exercise.lastUpdated = new Date().toISOString();
      
      await setDoc(docRef, cleanUndefined(exercise));
    } catch (error) {
      console.error('Error evaluating exercise with AI:', error);
      throw error;
    }
  }
};
