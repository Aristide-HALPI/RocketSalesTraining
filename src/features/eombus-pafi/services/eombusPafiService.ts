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
  evaluatedAt?: string;
}

export interface EombusPafiExercise {
  id: string;
  userId: string;
  type: 'eombus';
  sections: Section[];
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated' | 'pending_validation' | 'published';
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

// Points maximum par type de question
const QUESTION_POINTS = {
  ouverte: 4,
  ouverte_importance: 4,
  fermee: 2,
  fermee_importance: 2
} as const;

// Points maximum par section selon le prompt de l'IA
const SECTION_MAX_POINTS = {
  entreprise: 42,    // 8*4 + 2*2 + 4 + 2
  organisation: 30,  // 5*4 + 2*2 + 4 + 2
  moyen: 22,        // 3*4 + 2*2 + 4 + 2
  budgets: 22,      // 3*4 + 2*2 + 4 + 2
  usages: 22,       // 3*4 + 2*2 + 4 + 2
  situation: 46     // 8*4 + 2*2 + 4 + 2 + 2*2
} as const;

const TOTAL_MAX_POINTS = 184; // Somme des points maximum de toutes les sections

// Types pour le score
type SectionScore = {
  id: string;
  title: string;
  points: number;
  maxPoints: number;
  score: number;
  evaluatedAt?: string;
  isFullyEvaluated: boolean;  // Si toutes les questions de la section ont une note
};

type TotalScore = {
  sectionScores: SectionScore[];
  evaluatedSections: number;
  totalSections: number;
  finalScore: number;
  maxScore: number;  // Toujours 100
  hasFullyEvaluatedSection: boolean;  // Si au moins une section est entièrement notée
  evaluationProgress: string;         // Message sur la progression
};

// Fonction pour calculer le score d'une section
const calculateSectionScore = (section: Section): SectionScore => {
  let totalPoints = 0;
  let answeredQuestions = 0;
  const totalQuestions = section.questions.length;
  
  section.questions.forEach(question => {
    if (question.score?.points !== undefined) {
      totalPoints += question.score.points;
      answeredQuestions++;
    }
  });

  const maxPoints = SECTION_MAX_POINTS[section.id as keyof typeof SECTION_MAX_POINTS];

  return {
    id: section.id,
    title: section.title,
    points: totalPoints,
    maxPoints,
    score: totalPoints,  // On garde le score brut, pas de pourcentage
    evaluatedAt: section.evaluatedAt,
    isFullyEvaluated: answeredQuestions === totalQuestions
  };
};

// Fonction pour calculer le score total
export const calculateTotalScore = (sections: Section[]): TotalScore => {
  const totalSections = sections.length;
  
  // Ne calculer que pour les sections qui ont au moins une question notée
  const evaluatedSections = sections.filter(section => 
    section.questions.some(q => q.score?.points !== undefined)
  );

  if (evaluatedSections.length === 0) {
    return {
      sectionScores: [],
      evaluatedSections: 0,
      totalSections,
      finalScore: 0,
      maxScore: 100,
      hasFullyEvaluatedSection: false,
      evaluationProgress: "Aucune section n'a encore été évaluée"
    };
  }

  // Calculer le score de chaque section évaluée
  const sectionScores = evaluatedSections.map(section => calculateSectionScore(section));

  // Vérifier si au moins une section est entièrement notée
  const hasFullyEvaluatedSection = sectionScores.some(section => section.isFullyEvaluated);

  // Le score final est la somme des points obtenus
  const totalPoints = sectionScores.reduce((sum, section) => sum + section.score, 0);

  // Convertir le score en pourcentage sur le total maximum possible (184 points)
  const finalScore = Math.round((totalPoints / TOTAL_MAX_POINTS) * 100);

  // Créer le message de progression
  const progress = `${sectionScores.filter(s => s.isFullyEvaluated).length}/${totalSections} sections entièrement évaluées`;

  console.log('Score calculation:', {
    sectionScores,
    evaluatedSections: evaluatedSections.length,
    totalSections,
    totalPoints,
    maxPoints: TOTAL_MAX_POINTS,
    finalScore,
    hasFullyEvaluatedSection,
    evaluationProgress: progress
  });

  return {
    sectionScores,
    evaluatedSections: evaluatedSections.length,
    totalSections,
    finalScore,
    maxScore: 100, // Le score final est toujours sur 100
    hasFullyEvaluatedSection,
    evaluationProgress: progress
  };
};

// Fonction pour mettre à jour une question avec un nouveau score
export const updateQuestionScore = (question: Question, points: number): Question => {
  const maxPoints = QUESTION_POINTS[question.type];
  const validPoints = Math.min(points, maxPoints); // S'assurer que les points ne dépassent pas le maximum

  return {
    ...question,
    score: {
      points: validPoints,
      maxPoints,
      percentage: (validPoints / maxPoints) * 100
    }
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

    // Vérifier si toutes les questions sont remplies
    const hasEmptyQuestions = exercise.sections.some(section =>
      section.questions.some(question => !question.text.trim())
    );

    if (hasEmptyQuestions) {
      throw new Error('Toutes les questions doivent être remplies avant de soumettre l\'exercice');
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

      console.log('AI Evaluation Response:', evaluation);

      const updatedSections = [...exercise.sections];
      
      // Map des titres de sections vers leurs IDs
      const sectionTitleToId: Record<string, string> = {
        'Entreprise': 'entreprise',
        'Organisation': 'organisation',
        'Moyens': 'moyen',
        'Budget': 'budgets',
        'Usages': 'usages',
        'Situation': 'situation'
      };

      // Grouper les réponses par section en utilisant l'ID de section
      const responsesBySection = evaluation.responses.reduce((acc, response) => {
        const sectionId = sectionTitleToId[response.section];
        if (!acc[sectionId]) {
          acc[sectionId] = [];
        }
        acc[sectionId].push(response);
        return acc;
      }, {} as Record<string, typeof evaluation.responses>);

      // Mettre à jour chaque section
      for (let i = startIndex; i < endIndex; i++) {
        const section = updatedSections[i];
        if (!section) continue;

        const sectionResponses = responsesBySection[section.id];
        if (!sectionResponses) {
          console.log('No responses found for section:', section.id);
          continue;
        }

        console.log(`Processing section ${section.id} with ${sectionResponses.length} responses`);

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
            section.questions[answeredQuestion.index] = updateQuestionScore(answeredQuestion, response.score);
            section.questions[answeredQuestion.index].feedback = response.comment;
            section.questions[answeredQuestion.index].trainerComment = response.comment;
          }
        });

        // Marquer la section comme évaluée
        section.evaluatedAt = new Date().toISOString();
      }

      const score = calculateTotalScore(updatedSections);

      console.log('AI score calculation:', score);

      const updates: Partial<EombusPafiExercise> = {
        sections: updatedSections,
        status: 'evaluated', // On passe en évalué dès qu'une section est entièrement notée
        evaluatedAt: new Date().toISOString(),
        totalScore: score.finalScore,
        maxScore: 100,
        aiEvaluation: evaluation
      };

      await updateDoc(exerciseRef, cleanUndefined(updates));

    } catch (error) {
      console.error('Error during AI evaluation:', error);
      throw error;
    }
  },

  async evaluateExercise(userId: string, sections: Section[], evaluatorId: string): Promise<void> {
    const exerciseRef = doc(db, `users/${userId}/exercises/eombus`);

    try {
      // Mettre à jour les scores des questions avec les points maximum
      const updatedSections = sections.map(section => ({
        ...section,
        questions: section.questions.map(question => {
          if (question.score?.points !== undefined) {
            return updateQuestionScore(question, question.score.points);
          }
          return question;
        }),
        evaluatedAt: new Date().toISOString() // Marquer la section comme évaluée
      }));

      const score = calculateTotalScore(updatedSections);

      await updateDoc(exerciseRef, {
        sections: updatedSections,
        status: 'evaluated', // On passe en évalué dès qu'une section est entièrement notée
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: evaluatorId,
        totalScore: score.finalScore,
        maxScore: 100
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

  async resetExercise(userId: string): Promise<void> {
    const exerciseRef = doc(db, `users/${userId}/exercises/eombus`);
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
  },
};
