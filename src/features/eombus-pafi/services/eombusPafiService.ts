import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AIEvaluationResponse } from '../../../services/AIService';
import { AIService } from '@/services/AIService';

export type QuestionType = 'ouverte' | 'ouverte_importance' | 'fermee' | 'fermee_importance';
export type Score = 0 | 1;
export type TimeContext = 'passé' | 'présent' | 'futur';

export interface Question {
  type: QuestionType;
  text: string;
  timeContext?: TimeContext;
  feedback?: string;
  score?: {
    points: number;
    maxPoints: number;
    percentage: number;
  };
  trainerComment?: string;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  trainerGeneralComment?: string;
}

export interface EombusPafiExercise {
  id: string;
  userId: string;
  type: 'eombus';
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated';
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
  trainerFinalComment?: string;
}

export const INITIAL_SECTIONS: Section[] = [
  {
    id: 'entreprise',
    title: 'Entreprise',
    description: 'Posez 8 questions ouvertes + 2 questions fermées, en variant, au choix, avec des questions sur une situation passée, actuelle, ou future. + posez 2 questions ouvertes d\'importance.',
    questions: [
      ...Array(8).fill(null).map(() => ({ type: 'ouverte' as const, text: '' })),
      ...Array(2).fill(null).map(() => ({ type: 'ouverte_importance' as const, text: '' })),
      ...Array(2).fill(null).map(() => ({ type: 'fermee' as const, text: '' }))
    ]
  },
  {
    id: 'organisation',
    title: 'Organisation',
    description: 'Posez 5 questions ouvertes + 2 questions fermées (en variant au choix, avec des questions concerant une situation passée, actuelle ou future) + posez 2 questions ouvertes d\'importance',
    questions: [
      ...Array(5).fill(null).map(() => ({ type: 'ouverte' as const, text: '' })),
      ...Array(2).fill(null).map(() => ({ type: 'ouverte_importance' as const, text: '' })),
      ...Array(2).fill(null).map(() => ({ type: 'fermee' as const, text: '' }))
    ]
  },
  {
    id: 'budgets',
    title: 'Budgets',
    description: 'Posez 3 questions ouvertes + 2 questions fermées (en variant au choix, avec des questions concerant une situation passée, actuelle ou future) + posez 1 question ouverte d\'importance + 1 question fermée d\'importance.',
    questions: [
      ...Array(3).fill(null).map(() => ({ type: 'ouverte' as const, text: '' })),
      { type: 'ouverte_importance' as const, text: '' },
      ...Array(2).fill(null).map(() => ({ type: 'fermee' as const, text: '' })),
      { type: 'fermee_importance' as const, text: '' }
    ]
  },
  {
    id: 'usages',
    title: 'Usages',
    description: 'Posez 3 questions ouvertes + 2 questions fermées (en variant au choix, avec des questions concerant la situation passée, actuelle ou future) + posez 1 question ouverte d\'importance + 1 question fermée d\'importance.',
    questions: [
      ...Array(3).fill(null).map(() => ({ type: 'ouverte' as const, text: '' })),
      { type: 'ouverte_importance' as const, text: '' },
      ...Array(2).fill(null).map(() => ({ type: 'fermee' as const, text: '' })),
      { type: 'fermee_importance' as const, text: '' }
    ]
  },
  {
    id: 'situation',
    title: 'Situation',
    description: 'Posez 8 questions ouvertes + 2 questions fermées (en variant au choix, avec des questions concerant la situation passée, actuelle ou future) + posez 2 questions ouvertes d\'importance + 2 questions fermées d\'importance.',
    questions: [
      ...Array(8).fill(null).map(() => ({ type: 'ouverte' as const, text: '' })),
      ...Array(2).fill(null).map(() => ({ type: 'ouverte_importance' as const, text: '' })),
      ...Array(2).fill(null).map(() => ({ type: 'fermee' as const, text: '' })),
      ...Array(2).fill(null).map(() => ({ type: 'fermee_importance' as const, text: '' }))
    ]
  }
];

function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

function calculateFinalScore(sections: Section[]): number {
  const totalPoints = sections.reduce((total, section) => {
    return total + section.questions.reduce((sectionTotal, question) => {
      return sectionTotal + (question.score?.points || 0);
    }, 0);
  }, 0);

  return totalPoints;
}

function isExerciseEmpty(sections: Section[]): boolean {
  return sections.every(section =>
    section.questions.every(question => !question.text.trim())
  );
}

export const eombusPafiService = {
  async getExercise(userId: string): Promise<EombusPafiExercise> {
    const exerciseRef = doc(db, `users/${userId}/exercises/eombus`);
    const exerciseDoc = await getDoc(exerciseRef);

    if (!exerciseDoc.exists()) {
      const newExercise: EombusPafiExercise = {
        id: 'eombus',
        userId,
        type: 'eombus',
        status: 'not_started',
        sections: INITIAL_SECTIONS,
        maxScore: INITIAL_SECTIONS.reduce((total, section) => total + section.questions.length * 100, 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(exerciseRef, cleanUndefined(newExercise));
      return newExercise;
    }

    return exerciseDoc.data() as EombusPafiExercise;
  },

  subscribeToExercise(userId: string, callback: (exercise: EombusPafiExercise) => void) {
    const exerciseRef = doc(db, `users/${userId}/exercises/eombus`);
    return onSnapshot(exerciseRef, async (doc) => {
      if (!doc.exists()) {
        const exercise = await this.getExercise(userId);
        callback(exercise);
        return;
      }
      callback(doc.data() as EombusPafiExercise);
    });
  },

  async updateExercise(userId: string, updates: Partial<EombusPafiExercise>) {
    const exerciseRef = doc(db, `users/${userId}/exercises/eombus`);
    await updateDoc(exerciseRef, cleanUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  },

  async submitExercise(userId: string) {
    const exercise = await this.getExercise(userId);
    
    if (isExerciseEmpty(exercise.sections)) {
      throw new Error('L\'exercice ne peut pas être soumis car il est vide');
    }

    await this.updateExercise(userId, {
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
  },

  async evaluateExercise(userId: string, sections: EombusPafiExercise['sections'], evaluatorId: string) {
    const totalScore = calculateFinalScore(sections);
    
    await this.updateExercise(userId, {
      sections,
      status: 'evaluated',
      totalScore,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: evaluatorId
    });
  },

  async evaluateWithAI(userId: string): Promise<void> {
    const exercise = await this.getExercise(userId);
    
    const evaluation = await AIService.evaluateExercise({
      type: 'company',
      sections: exercise.sections
    });

    // Mettre à jour les scores et commentaires basés sur l'évaluation AI
    const updatedSections = exercise.sections.map((section, sectionIndex) => ({
      ...section,
      questions: section.questions.map((question, questionIndex) => {
        const aiScore = evaluation.scores?.[sectionIndex]?.[questionIndex];
        const aiFeedback = evaluation.feedbacks?.[sectionIndex]?.[questionIndex];

        return {
          ...question,
          score: aiScore ? {
            points: aiScore,
            maxPoints: 100,
            percentage: aiScore
          } : question.score,
          feedback: aiFeedback || question.feedback
        };
      })
    }));

    const totalScore = calculateFinalScore(updatedSections);

    await this.updateExercise(userId, {
      sections: updatedSections,
      totalScore,
      aiEvaluation: evaluation,
      status: 'evaluated',
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: 'ai'
    });
  }
};
