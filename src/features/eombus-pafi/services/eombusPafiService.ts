import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AIService } from '@/services/AIService';
import { AIEvaluationResponse } from '../../../api/ai/routes/evaluation';

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
  sections: Section[];
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated' | 'published';
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string;
  aiEvaluation?: any;
  evaluatedAt?: string;
  evaluatedBy?: string;
  submittedAt?: string;
  publishedAt?: string;
  trainerFinalComment?: string;
  totalScore?: number;
  maxScore?: number;
}

interface EombusEvaluationResponse extends AIEvaluationResponse {
  responses: Array<{
    characteristic: number;
    section: string;
    score: number;
    maxPoints: number;
    comment: string;
  }>;
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
    id: 'moyen',
    title: 'Moyen',
    description: 'Posez 3 questions ouvertes + 2 questions fermées (en variant au choix, avec des questions concerant une situation passée, actuelle ou future) + posez 1 question ouverte d\'importance + 1 question fermée d\'importance.',
    questions: [
      ...Array(3).fill(null).map(() => ({ type: 'ouverte' as const, text: '' })),
      { type: 'ouverte_importance' as const, text: '' },
      ...Array(2).fill(null).map(() => ({ type: 'fermee' as const, text: '' })),
      { type: 'fermee_importance' as const, text: '' }
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

function convertScoresToNumbers(exercise: any): EombusPafiExercise {
  return {
    ...exercise,
    totalScore: exercise.totalScore ? Number(exercise.totalScore) : undefined,
    maxScore: exercise.maxScore ? Number(exercise.maxScore) : undefined
  };
}

// Fonction pour calculer le score total
export const calculateTotalScore = (sections: Section[]): { totalScore: number; maxScore: number; finalScore: number } => {
  let totalScore = 0;
  const MAX_SCORE = 190; // Score maximum fixe : total des points maximum possibles

  // Calculer le score total en additionnant tous les points
  sections.forEach(section => {
    section.questions.forEach(question => {
      if (question.score) {
        totalScore += question.score.points;
      }
    });
  });

  // Calculer le score final sur 100 en utilisant une règle de trois
  const finalScore = Math.round((totalScore / MAX_SCORE) * 100);

  return {
    totalScore,
    maxScore: MAX_SCORE,
    finalScore
  };
};

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

    return convertScoresToNumbers(exerciseDoc.data()) as EombusPafiExercise;
  },

  subscribeToExercise(userId: string, callback: (exercise: EombusPafiExercise) => void) {
    const exerciseRef = doc(db, `users/${userId}/exercises/eombus`);

    return onSnapshot(exerciseRef, (doc) => {
      if (doc.exists()) {
        callback(convertScoresToNumbers(doc.data()));
      }
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

    // Vérifier si l'exercice est vide
    const isExerciseEmpty = exercise.sections.every(section =>
      section.questions.every(question => !question.text.trim())
    );

    if (isExerciseEmpty) {
      throw new Error('L\'exercice ne peut pas être soumis car il est vide');
    }

    await this.updateExercise(userId, {
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
  },

  async evaluateWithAI(
    userId: string,
    organizationId: string,
    startIndex: number = 0,
    endIndex: number = 2
  ): Promise<void> {
    const exerciseRef = doc(db, `users/${userId}/exercises/eombus`);
    const exerciseDoc = await getDoc(exerciseRef);

    if (!exerciseDoc.exists()) {
      throw new Error('Exercise not found');
    }

    const exercise = exerciseDoc.data() as EombusPafiExercise;

    // On permet l'évaluation si l'exercice est soumis ou déjà évalué
    if (exercise.status !== 'submitted' && exercise.status !== 'evaluated') {
      throw new Error('Exercise must be submitted or evaluated before evaluation');
    }

    try {
      const sectionsToEvaluate = exercise.sections.slice(startIndex, endIndex);

      const aiService = AIService;
      const evaluation = await aiService.evaluateExercise({
        type: 'eombus',
        content: JSON.stringify({
          sections: sectionsToEvaluate.map(section => ({
            id: section.id,
            title: section.title,
            questions: section.questions.map(q => ({
              type: q.type,
              text: q.text,
              timeContext: q.timeContext
            }))
          }))
        }),
        organizationId,
        botId: 'default'
      }) as EombusEvaluationResponse;

      const updatedSections = [...exercise.sections];
      
      // Grouper les réponses par section
      const responsesBySection = evaluation.responses.reduce((acc, response) => {
        if (!acc[response.section]) {
          acc[response.section] = [];
        }
        acc[response.section].push(response);
        return acc;
      }, {} as Record<string, typeof evaluation.responses>);

      // Mettre à jour chaque section
      for (let i = startIndex; i < endIndex; i++) {
        const section = updatedSections[i];
        if (!section) continue;

        const sectionResponses = responsesBySection[section.title];
        if (!sectionResponses) continue;

        // Filtrer les questions qui ont du contenu
        const answeredQuestions = section.questions
          .map((q, index) => ({ ...q, index }))
          .filter(q => q.text.trim() !== '');

        // Pour chaque réponse de l'IA, trouver la question correspondante
        sectionResponses.forEach((response, responseIndex) => {
          // Trouver la question répondue correspondante
          const answeredQuestion = answeredQuestions[responseIndex];
          if (answeredQuestion) {
            // Mettre à jour la question originale avec le bon index
            section.questions[answeredQuestion.index] = {
              ...answeredQuestion,
              score: {
                points: response.score,
                maxPoints: response.maxPoints,
                percentage: (response.score / response.maxPoints) * 100
              },
              feedback: response.comment,
              trainerComment: response.comment
            };
          }
        });
      }

      // Calculer le score total
      const updates: Partial<EombusPafiExercise> = {
        sections: updatedSections,
        status: 'evaluated',
        evaluatedAt: new Date().toISOString()
      };

      // Calculer le score total après chaque évaluation
      const { finalScore, maxScore } = calculateTotalScore(updatedSections);
      updates.totalScore = finalScore;
      updates.maxScore = maxScore;

      await updateDoc(exerciseRef, cleanUndefined(updates));

    } catch (error) {
      console.error('Error during AI evaluation:', error);
      throw error;
    }
  },

  async evaluateExercise(userId: string, sections: Section[], evaluatorId: string): Promise<void> {
    const exerciseRef = doc(db, `users/${userId}/exercises/eombus`);

    try {
      const { finalScore, maxScore } = calculateTotalScore(sections);

      await updateDoc(exerciseRef, {
        sections,
        status: 'evaluated',
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: evaluatorId,
        totalScore: finalScore,
        maxScore
      });
    } catch (error) {
      console.error('Error during manual evaluation:', error);
      throw error;
    }
  },

  async publishExercise(userId: string): Promise<void> {
    const exercise = await this.getExercise(userId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    await this.updateExercise(userId, {
      status: 'published',
      publishedAt: new Date().toISOString()
    });
  },
};
