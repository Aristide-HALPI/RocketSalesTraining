import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AIEvaluationResponse } from '../../../api/ai/routes/evaluation';
import { AIService } from '@/services/AIService';

// Types pour les différentes questions
export type QuestionType = 'explicite' | 'evocatrice' | 'projective';

// Type pour le score
export type Score = 0 | 1 | 2 | 3 | 4;

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
  trainerEvaluations?: any; // Stockage des évaluations du formateur
}

// Configuration des sections de l'exercice
export const SECTIONS_CONFIG: TroisClesSection[] = [
  {
    id: 'questions_explicites',
    title: 'Questions Explicites',
    description: 'Questions explicites pour comprendre le contexte',
    questionsExplicites: Array(7).fill(null).map(() => ({
      text: '',
      score: 0,
      trainerComment: ''
    }))
  },
  {
    id: 'questions_evocatrices',
    title: 'Questions Évocatrices',
    description: 'Questions évocatrices pour approfondir',
    questionsEvocatrices: Array(3).fill(null).map(() => ({
      passe: '',
      present: '',
      futur: '',
      scoresPasse: 0,
      scoresPresent: 0,
      scoresFutur: 0,
      commentPasse: '',
      commentPresent: '',
      commentFutur: ''
    }))
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
    questionsProjectives: Array(5).fill(null).map(() => ({
      question: '',
      reponseClient: '',
      confirmation: '',
      impacts: '',
      besoinSolution: '',
      scores: {},
      comments: {}
    }))
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

  return totalPoints;
}

export const troisClesService = {
  async getExercise(userId: string): Promise<TroisClesExercise> {
    if (!userId) {
      console.error('getExercise called without userId');
      throw new Error('userId is required');
    }

    console.log('Getting exercise for user:', userId);
    const docRef = doc(db, `users/${userId}/exercises/trois-cles`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const exercise = docSnap.data() as TroisClesExercise;
      console.log('Exercise loaded:', {
        id: exercise.id,
        userId: exercise.userId,
        status: exercise.status,
        sections: exercise.sections.map((s: TroisClesSection) => ({
          id: s.id,
          questionsCount: (
            (s.questionsExplicites?.length || 0) +
            (s.questionsEvocatrices?.length || 0) +
            (s.questionsProjectives?.length || 0)
          ),
          hasResponses: (
            s.questionsExplicites?.some(q => q.text?.trim()) ||
            s.questionsEvocatrices?.some(q => q.passe?.trim() || q.present?.trim() || q.futur?.trim()) ||
            s.questionsProjectives?.some(q => q.question?.trim())
          )
        }))
      });
      return exercise;
    }

    // Créer un nouvel exercice avec des objets distincts pour chaque entrée
    const newExercise: TroisClesExercise = {
      id: 'trois-cles',
      userId,
      status: 'not_started',
      sections: SECTIONS_CONFIG.map(section => ({
        ...section,
        questionsExplicites: section.questionsExplicites?.map(q => ({ ...q })),
        questionsEvocatrices: section.questionsEvocatrices?.map(q => ({ ...q })),
        questionsProjectives: section.questionsProjectives?.map(q => ({ ...q })),
        impactsTemporels: section.impactsTemporels ? { ...section.impactsTemporels } : undefined,
        besoinsSolution: section.besoinsSolution ? { ...section.besoinsSolution } : undefined
      })),
      maxScore: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, cleanUndefined(newExercise));
    return newExercise;
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

      // Déterminer le type de section à évaluer en fonction des sections fournies
      const sectionType = this.determineSectionType(exerciseToEvaluate?.sections || []);
      console.log('🔍 Type de section détecté:', sectionType);
      
      // Créer une version optimisée de l'exercice avec seulement les données nécessaires
      const optimizedExercise = this.createOptimizedExercise(exercise, exerciseToEvaluate, sectionType);

      console.log('Calling AI service for evaluation');
      console.log('🔍 Sections envoyées à l\'IA:', optimizedExercise.sections.length);
      console.log('🔍 Détail des sections:', optimizedExercise.sections.map(s => s.title));
      console.log('🔍 Taille des données envoyées:', JSON.stringify(optimizedExercise).length, 'caractères');
      
      // Fonction pour appeler l'API avec retry
      const callAIWithRetry = async (maxRetries = 3, timeout = 60000): Promise<AIEvaluationResponse> => {
        let lastError: Error | unknown = new Error('Erreur inconnue');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`🔄 Tentative d'évaluation IA ${attempt}/${maxRetries}`);
            
            // Créer une promesse avec timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Timeout dépassé')), timeout);
            });
            
            // Appeler l'API avec un timeout
            const responsePromise = AIService.evaluateExercise({
              type: 'qles', // Utiliser le type spécifique 'qles' pour l'exercice 3 clés
              content: JSON.stringify(optimizedExercise),
              organizationId: exercise.organizationId || 'default',
              botId: exercise.botId || import.meta.env.VITE_QLES_BOT_ID || 'default'
            });
            
            // Race entre le timeout et la réponse
            return await Promise.race([responsePromise, timeoutPromise]);
          } catch (error: unknown) {
            lastError = error;
            console.error(`❌ Échec de la tentative ${attempt}:`, error);
            
            // Si c'est une erreur 504, on réessaie
            const is504Error = error instanceof Error && error.message.includes('504');
            if (is504Error && attempt < maxRetries) {
              console.log(`⏱️ Attente avant nouvelle tentative (${attempt + 1}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Attente progressive
              continue;
            }
            
            // Si c'est la dernière tentative ou une autre erreur, on la propage
            throw error;
          }
        }
        
        throw lastError;
      };
      
      // Appeler l'API avec retry et timeout étendu
      const aiResponse = await callAIWithRetry(3, 90000); // 3 tentatives, 90 secondes de timeout

      // Si c'était une évaluation partielle, fusionner avec l'évaluation existante
      let updatedAiEvaluation = aiResponse;
      if (exerciseToEvaluate && exercise.aiEvaluation) {
        // Fusionner les réponses IA précédentes avec les nouvelles
        // en préservant les réponses des autres sections
        const previousResponses = exercise.aiEvaluation.evaluation?.responses || [];
        const newResponses = aiResponse.evaluation?.responses || [];
        
        // Identifier les sections des nouvelles réponses
        const newSections = new Set(newResponses.map((r: { section: string }) => r.section));
        
        // Conserver uniquement les réponses des sections qui ne sont pas dans les nouvelles réponses
        const preservedResponses = previousResponses.filter((r: { section: string }) => !newSections.has(r.section));
        
        // Fusionner les réponses préservées avec les nouvelles
        const mergedResponses = [...preservedResponses, ...newResponses];
        
        // Créer une version typée de l'évaluation mise à jour
        updatedAiEvaluation = {
          ...exercise.aiEvaluation,
          evaluation: {
            ...aiResponse.evaluation,
            responses: mergedResponses
          },
          // Utiliser any pour contourner les restrictions de type
          // car la structure réelle contient commentaireGeneral
          ...(aiResponse as any).commentaireGeneral ? 
            { commentaireGeneral: (aiResponse as any).commentaireGeneral } : 
            { commentaireGeneral: (exercise.aiEvaluation as any).commentaireGeneral || '' }
        };
        
        console.log('Fusion des évaluations IA:', {
          previousSections: [...new Set(previousResponses.map(r => r.section))],
          newSections: [...newSections],
          preservedSections: [...new Set(preservedResponses.map(r => r.section))],
          totalResponses: mergedResponses.length
        });
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
  },

  /**
   * Détermine le type de section à évaluer en fonction des sections fournies
   */
  determineSectionType(sections: TroisClesExercise['sections']): 'explicite' | 'evocatrice' | 'projective' | 'full' {
    if (sections.length === 0) return 'full';
    
    // Vérifier le titre de la première section pour déterminer le type
    const firstSection = sections[0];
    
    if (firstSection.title.toLowerCase().includes('explicite')) {
      return 'explicite';
    } else if (firstSection.title.toLowerCase().includes('evocatrice')) {
      return 'evocatrice';
    } else if (firstSection.title.toLowerCase().includes('projective')) {
      return 'projective';
    }
    
    // Si on ne peut pas déterminer le type, renvoyer 'full'
    return 'full';
  },
  
  /**
   * Crée une version optimisée de l'exercice avec seulement les données nécessaires
   */
  createOptimizedExercise(fullExercise: TroisClesExercise, partialExercise?: TroisClesExercise, sectionType?: 'explicite' | 'evocatrice' | 'projective' | 'full'): TroisClesExercise {
    // Si on n'a pas de type de section ou si c'est 'full', utiliser l'exercice complet ou partiel tel quel
    if (!sectionType || sectionType === 'full') {
      return partialExercise || fullExercise;
    }
    
    // Créer un nouvel exercice avec les métadonnées nécessaires mais sans les sections
    const optimizedExercise: TroisClesExercise = {
      id: fullExercise.id,
      userId: fullExercise.userId,
      status: fullExercise.status,
      createdAt: fullExercise.createdAt,
      updatedAt: fullExercise.updatedAt,
      organizationId: fullExercise.organizationId,
      botId: fullExercise.botId,
      maxScore: fullExercise.maxScore,
      sections: []
    };
    
    // Utiliser les sections de l'exercice partiel s'il est fourni, sinon utiliser l'exercice complet
    const sourceExercise = partialExercise || fullExercise;
    
    // Filtrer les sections selon le type demandé
    switch (sectionType) {
      case 'explicite':
        // Pour les questions explicites, inclure uniquement la section 0 (questions explicites)
        optimizedExercise.sections = sourceExercise.sections.filter(section => 
          section.title.toLowerCase().includes('explicite')
        );
        break;
      case 'evocatrice':
        // Pour les questions évocatrices, inclure uniquement la section 1 (questions évocatrices)
        optimizedExercise.sections = sourceExercise.sections.filter(section => 
          section.title.toLowerCase().includes('evocatrice')
        );
        break;
      case 'projective':
        // Pour les questions projectives, inclure uniquement la section 4 (questions projectives)
        optimizedExercise.sections = sourceExercise.sections.filter(section => 
          section.title.toLowerCase().includes('projective')
        );
        break;
    }
    
    // Si aucune section n'a été trouvée, utiliser les sections fournies dans l'exercice partiel
    if (optimizedExercise.sections.length === 0 && partialExercise) {
      optimizedExercise.sections = partialExercise.sections;
    }
    
    return optimizedExercise;
  }
};
