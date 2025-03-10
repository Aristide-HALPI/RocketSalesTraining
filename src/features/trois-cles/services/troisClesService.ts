import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AIEvaluationResponse } from '../../../api/ai/routes/evaluation';
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
  text: string;
  score?: Score;
  trainerComment?: string;
}

// Interface pour les besoins de solution
export interface BesoinsSolution {
  text: string;
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
  organizationId?: string;
  botId?: string;
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
    description: 'Analyse des impacts',
    impactsTemporels: {
      text: '',
      score: 0,
      trainerComment: ''
    }
  },
  {
    id: 'besoins_solution',
    title: 'Besoins de Solution',
    description: 'Analyse des besoins de solution',
    besoinsSolution: {
      text: '',
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

function isSectionEmpty(section: TroisClesSection): boolean {
  const hasEmptyExplicites = section.questionsExplicites?.every(q => !q.text) ?? true;
  const hasEmptyEvocatrices = section.questionsEvocatrices?.every(q => !q.passe && !q.present && !q.futur) ?? true;
  const hasEmptyImpacts = section.impactsTemporels?.text ? false : true;
  const hasEmptyBesoins = section.besoinsSolution?.text ? false : true;
  const hasEmptyProjectives = section.questionsProjectives?.every(q => !q.question && !q.reponseClient && !q.confirmation && !q.impacts && !q.besoinSolution) ?? true;

  return hasEmptyExplicites && hasEmptyEvocatrices && hasEmptyImpacts && hasEmptyBesoins && hasEmptyProjectives;
}

function isExerciseEmpty(sections: TroisClesSection[]): boolean {
  return sections.every(isSectionEmpty);
}

function isExerciseComplete(sections: TroisClesSection[]): boolean {
  // Vérifier les questions explicites
  const hasExplicites = sections[0]?.questionsExplicites?.some(q => q.text.trim());

  // Vérifier les questions évocatrices
  const hasEvocatrices = sections[1]?.questionsEvocatrices?.some(q => 
    q.passe.trim() || q.present.trim() || q.futur.trim()
  );

  // Vérifier les impacts
  const hasImpacts = sections[2]?.impactsTemporels?.text?.trim();

  // Vérifier les besoins de solution
  const hasBesoins = sections[3]?.besoinsSolution?.text?.trim();

  // Vérifier les questions projectives
  const hasProjectives = sections[4]?.questionsProjectives?.some(q => 
    q.question.trim() || q.reponseClient.trim() || q.confirmation.trim() || 
    q.impacts.trim() || q.besoinSolution.trim()
  );

  return !!(hasExplicites && hasEvocatrices && hasImpacts && hasBesoins && hasProjectives);
}

export const troisClesService = {
  async getExercise(userId: string): Promise<TroisClesExercise> {
    try {
      console.log('Getting exercise for user:', userId);
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
        
        const cleanedExercise = cleanUndefined(newExercise);
        console.log('New exercise to save:', cleanedExercise);
        
        await setDoc(exerciseRef, cleanedExercise);
        return newExercise;
      }

      const existingExercise = exerciseDoc.data() as TroisClesExercise;
      console.log('Raw exercise data:', existingExercise);

      // Convertir pending_validation en submitted
      if (existingExercise.status === 'pending_validation') {
        console.log('Converting pending_validation status to submitted');
        existingExercise.status = 'submitted';
        await updateDoc(exerciseRef, {
          status: 'submitted',
          updatedAt: new Date().toISOString()
        });
      }

      // Vérifier si l'exercice a un statut valide
      if (!existingExercise.status) {
        console.log('Exercise has no status, setting to not_started');
        existingExercise.status = 'not_started';
      }

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

      // Vérifier le contenu de l'exercice pour déterminer son statut
      if (existingExercise.status === 'not_started') {
        const hasContent = existingExercise.sections.some(section => {
          const hasExplicites = section.questionsExplicites?.some(q => q.text?.trim());
          const hasEvocatrices = section.questionsEvocatrices?.some(q => 
            q.passe?.trim() || q.present?.trim() || q.futur?.trim()
          );
          const hasImpacts = section.impactsTemporels?.text?.trim();
          const hasBesoins = section.besoinsSolution?.text?.trim();
          const hasProjectives = section.questionsProjectives?.some(q => 
            q.question?.trim() || q.reponseClient?.trim() || q.confirmation?.trim() || 
            q.impacts?.trim() || q.besoinSolution?.trim()
          );
          return !!(hasExplicites || hasEvocatrices || hasImpacts || hasBesoins || hasProjectives);
        });

        if (hasContent) {
          console.log('Exercise has content but status is not_started, updating to in_progress');
          existingExercise.status = 'in_progress';
          await updateDoc(exerciseRef, {
            status: 'in_progress',
            updatedAt: new Date().toISOString()
          });
        }
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
    
    // Vérifier si l'exercice existe
    const exerciseDoc = await getDoc(exerciseRef);
    if (!exerciseDoc.exists()) {
      console.error('Exercise not found, creating new one...');
      const newExercise: TroisClesExercise = {
        id: 'trois-cles',
        userId,
        status: 'not_started',
        sections: SECTIONS_CONFIG,
        maxScore: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...updates
      };
      await setDoc(exerciseRef, cleanUndefined(newExercise));
      return;
    }

    // Mettre à jour l'exercice existant
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

  async submitExercise(userId: string): Promise<void> {
    try {
      console.log('Submitting exercise for user:', userId);
      const exerciseRef = doc(db, `users/${userId}/exercises/trois-cles`);
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        console.error('Exercise document does not exist');
        throw new Error('L\'exercice n\'existe pas');
      }

      const exercise = exerciseDoc.data() as TroisClesExercise;
      console.log('Current exercise status:', exercise.status);

      // Vérifier si l'exercice peut être soumis
      if (exercise.status === 'submitted' || exercise.status === 'evaluated') {
        console.log('Exercise already submitted or evaluated');
        return;
      }

      // Mettre à jour le statut
      await updateDoc(exerciseRef, {
        status: 'submitted',
        updatedAt: new Date().toISOString()
      });

      console.log('Exercise successfully submitted');
    } catch (error) {
      console.error('Error in submitExercise:', error);
      throw error;
    }
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

  async evaluateWithAI(userId: string, exerciseToEvaluate?: TroisClesExercise): Promise<void> {
    try {
      console.log('Starting AI evaluation for user:', userId);
      const exerciseRef = doc(db, `users/${userId}/exercises/trois-cles`);
      const exerciseDoc = await getDoc(exerciseRef);
      console.log('Exercise doc exists:', exerciseDoc.exists());
      const exercise = exerciseDoc.data() as TroisClesExercise;
      console.log('Current exercise status:', exercise.status);

      if (exercise.status !== 'submitted') {
        console.error('Exercise must be submitted before AI evaluation');
        throw new Error('L\'exercice doit être soumis avant l\'évaluation par l\'IA');
      }

      // Si un exercice spécifique est fourni pour l'évaluation, l'utiliser
      // Sinon, utiliser l'exercice complet
      const exerciseForEvaluation = exerciseToEvaluate || exercise;

      console.log('Calling AI service for evaluation');
      const aiResponse = await AIService.evaluateExercise({
        type: 'sections',
        content: JSON.stringify(exerciseForEvaluation),
        organizationId: exercise.organizationId || 'default',
        botId: exercise.botId || import.meta.env.VITE_QLES_BOT_ID || 'default'
      });

      // Si c'était une évaluation partielle, fusionner avec l'évaluation existante
      let updatedAiEvaluation = aiResponse;
      if (exerciseToEvaluate && exercise.aiEvaluation) {
        updatedAiEvaluation = {
          ...exercise.aiEvaluation,
          ...aiResponse
        };
      }

      console.log('Updating exercise with AI evaluation');
      await updateDoc(exerciseRef, {
        aiEvaluation: updatedAiEvaluation,
        status: 'submitted', // Garder le statut submitted au lieu de pending_validation
        updatedAt: new Date().toISOString()
      });
      console.log('AI evaluation completed successfully');
    } catch (error) {
      console.error('Error in evaluateWithAI:', error);
      throw error;
    }
  }
};
