import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AIEvaluationResponse } from '../../../services/AIService';
import { AIService } from '@/services/AIService';

// Types pour les différentes questions
export type QuestionType = 'explicite' | 'evocatrice' | 'projective';

// Type pour le score
export type Score = 0 | 1 | 2;

// Interface pour une question explicite
export interface QuestionExplicite {
  text: string;
  score?: Score;
  trainerComment?: string;
}

// Interface pour une question évocatrice
export interface QuestionEvocatrice {
  passe: string;
  present: string;
  futur: string;
  scoresPasse?: Score;
  scoresPresent?: Score;
  scoresFutur?: Score;
  commentPasse?: string;
  commentPresent?: string;
  commentFutur?: string;
}

// Interface pour les impacts temporels
export interface ImpactsTemporels {
  passe: string;
  present: string;
  futur: string;
  score?: Score;
  trainerComment?: string;
}

// Interface pour les besoins de solution
export interface BesoinsSolution {
  passe: string;
  present: string;
  futur: string;
  score?: Score;
  trainerComment?: string;
}

// Interface pour une question projective
export interface QuestionProjective {
  question: string;
  reponseClient: string;
  confirmation: string;
  impacts: string;
  besoinSolution: string;
  scores?: {
    question?: Score;
    reponseClient?: Score;
    confirmation?: Score;
    impacts?: Score;
    besoinSolution?: Score;
  };
  comments?: {
    question?: string;
    reponseClient?: string;
    confirmation?: string;
    impacts?: string;
    besoinSolution?: string;
  };
}

// Interface pour une section de l'exercice
export interface TroisClesSection {
  id: string;
  title: string;
  description: string;
  questionsExplicites?: QuestionExplicite[];
  questionsEvocatrices?: QuestionEvocatrice[];
  impactsTemporels?: ImpactsTemporels;
  besoinsSolution?: BesoinsSolution;
  questionsProjectives?: QuestionProjective[];
  trainerGeneralComment?: string;
}

// Interface principale de l'exercice
export interface TroisClesExercise {
  id: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated' | 'pending_validation';
  sections: TroisClesSection[];
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
export const SECTIONS_CONFIG: TroisClesSection[] = [
  {
    id: 'questions_explicites',
    title: 'Questions Explicites',
    description: 'Questions explicites pour comprendre le contexte',
    questionsExplicites: Array(7).fill({
      text: '',
      score: 0,
      trainerComment: ''
    })
  },
  {
    id: 'questions_evocatrices',
    title: 'Questions Évocatrices',
    description: 'Questions évocatrices pour approfondir',
    questionsEvocatrices: Array(3).fill({
      passe: '',
      present: '',
      futur: '',
      scoresPasse: 0,
      scoresPresent: 0,
      scoresFutur: 0,
      commentPasse: '',
      commentPresent: '',
      commentFutur: ''
    })
  },
  {
    id: 'impacts_temporels',
    title: 'Impacts Temporels',
    description: 'Analyse des impacts dans le temps',
    impactsTemporels: {
      passe: '',
      present: '',
      futur: '',
      score: 0,
      trainerComment: ''
    }
  },
  {
    id: 'besoins_solution',
    title: 'Besoins de Solution',
    description: 'Analyse des besoins de solution',
    besoinsSolution: {
      passe: '',
      present: '',
      futur: '',
      score: 0,
      trainerComment: ''
    }
  },
  {
    id: 'questions_projectives',
    title: 'Questions Projectives',
    description: 'Questions projectives pour explorer les possibilités',
    questionsProjectives: Array(5).fill({
      question: '',
      reponseClient: '',
      confirmation: '',
      impacts: '',
      besoinSolution: '',
      scores: {},
      comments: {}
    })
  }
];

function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

function calculateFinalScore(sections: TroisClesSection[]): number {
  let totalPoints = 0;
  let maxPossibleScore = 0;

  sections.forEach(section => {
    // Questions explicites
    section.questionsExplicites?.forEach(q => {
      if (q.score) totalPoints += q.score;
      maxPossibleScore += 2;
    });

    // Questions évocatrices
    section.questionsEvocatrices?.forEach(q => {
      if (q.scoresPasse) totalPoints += q.scoresPasse;
      if (q.scoresPresent) totalPoints += q.scoresPresent;
      if (q.scoresFutur) totalPoints += q.scoresFutur;
      maxPossibleScore += 6;
    });

    // Impacts temporels
    if (section.impactsTemporels?.score) {
      totalPoints += section.impactsTemporels.score;
      maxPossibleScore += 2;
    }

    // Besoins de solution
    if (section.besoinsSolution?.score) {
      totalPoints += section.besoinsSolution.score;
      maxPossibleScore += 2;
    }

    // Questions projectives
    section.questionsProjectives?.forEach(q => {
      if (q.scores?.question) totalPoints += q.scores.question;
      if (q.scores?.reponseClient) totalPoints += q.scores.reponseClient;
      if (q.scores?.confirmation) totalPoints += q.scores.confirmation;
      if (q.scores?.impacts) totalPoints += q.scores.impacts;
      if (q.scores?.besoinSolution) totalPoints += q.scores.besoinSolution;
      maxPossibleScore += 10;
    });
  });

  return Math.round((totalPoints / maxPossibleScore) * 50);
}

function isExerciseEmpty(sections: TroisClesSection[]): boolean {
  return sections.every(section => {
    const hasEmptyExplicites = section.questionsExplicites?.every(q => !q.text);
    const hasEmptyEvocatrices = section.questionsEvocatrices?.every(q => !q.passe && !q.present && !q.futur);
    const hasEmptyImpacts = !section.impactsTemporels?.passe && !section.impactsTemporels?.present && !section.impactsTemporels?.futur;
    const hasEmptyBesoins = !section.besoinsSolution?.passe && !section.besoinsSolution?.present && !section.besoinsSolution?.futur;
    const hasEmptyProjectives = section.questionsProjectives?.every(q => !q.question && !q.reponseClient && !q.confirmation && !q.impacts && !q.besoinSolution);
    
    return hasEmptyExplicites && hasEmptyEvocatrices && hasEmptyImpacts && hasEmptyBesoins && hasEmptyProjectives;
  });
}

export const troisClesService = {
  async getExercise(userId: string): Promise<TroisClesExercise> {
    try {
      const exerciseRef = doc(db, `users/${userId}/exercises/trois-cles`);
      const exerciseDoc = await getDoc(exerciseRef);
      console.log('Exercise doc exists:', exerciseDoc.exists());

      if (!exerciseDoc.exists()) {
        console.log('Creating new exercise...');
        const newExercise: TroisClesExercise = {
          id: 'trois-cles',
          userId,
          status: 'not_started',
          sections: SECTIONS_CONFIG,
          maxScore: 50,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Assurez-vous que l'exercice est correctement nettoyé avant de le sauvegarder
        const cleanedExercise = cleanUndefined(newExercise);
        console.log('New exercise to save:', cleanedExercise);
        
        await setDoc(exerciseRef, cleanedExercise);
        return newExercise;
      }

      const existingExercise = exerciseDoc.data() as TroisClesExercise;
      console.log('Existing exercise:', existingExercise);

      // Si l'exercice existe mais n'a pas de sections, initialisons-les
      if (!existingExercise.sections || existingExercise.sections.length === 0) {
        console.log('Exercise exists but has no sections, initializing...');
        const updatedExercise = {
          ...existingExercise,
          sections: SECTIONS_CONFIG,
          updatedAt: new Date().toISOString()
        };
        await setDoc(exerciseRef, cleanUndefined(updatedExercise));
        return updatedExercise;
      }

      return existingExercise;
    } catch (error) {
      console.error('Error in getExercise:', error);
      throw error;
    }
  },

  subscribeToExercise(userId: string, callback: (exercise: TroisClesExercise) => void) {
    const exerciseRef = doc(db, `users/${userId}/exercises/trois-cles`);
    return onSnapshot(exerciseRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as TroisClesExercise);
      }
    });
  },

  async updateExercise(userId: string, updates: Partial<TroisClesExercise>) {
    const exerciseRef = doc(db, `users/${userId}/exercises/trois-cles`);
    const cleanUpdates = cleanUndefined({
      ...updates,
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });

    if (cleanUpdates.status === 'in_progress' && !cleanUpdates.totalScore) {
      cleanUpdates.totalScore = calculateFinalScore(cleanUpdates.sections || []);
    }

    await updateDoc(exerciseRef, cleanUpdates);
  },

  async submitExercise(userId: string) {
    const exerciseRef = doc(db, `users/${userId}/exercises/trois-cles`);
    const exerciseDoc = await getDoc(exerciseRef);
    const exercise = exerciseDoc.data() as TroisClesExercise;

    if (isExerciseEmpty(exercise.sections)) {
      throw new Error('L\'exercice ne peut pas être soumis car il est vide');
    }

    await updateDoc(exerciseRef, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  async evaluateExercise(userId: string, sections: TroisClesExercise['sections'], evaluatorId: string) {
    const exerciseRef = doc(db, `users/${userId}/exercises/trois-cles`);
    const totalScore = calculateFinalScore(sections);

    await updateDoc(exerciseRef, cleanUndefined({
      sections,
      status: 'evaluated',
      totalScore,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: evaluatorId,
      updatedAt: new Date().toISOString()
    }));
  },

  async evaluateWithAI(userId: string): Promise<void> {
    const exerciseRef = doc(db, `users/${userId}/exercises/trois-cles`);
    const exerciseDoc = await getDoc(exerciseRef);
    const exercise = exerciseDoc.data() as TroisClesExercise;

    if (exercise.status !== 'submitted') {
      throw new Error('L\'exercice doit être soumis avant l\'évaluation par l\'IA');
    }

    const aiService = new AIService();
    const aiEvaluation = await aiService.evaluateExercise(exercise);

    await updateDoc(exerciseRef, {
      aiEvaluation,
      status: 'pending_validation',
      updatedAt: new Date().toISOString()
    });
  }
};
