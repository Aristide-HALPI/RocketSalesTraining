import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface ObjectionEntry {
  text: string;
  type: string;
  justification: string;
  correctType: string;
  correctJustification: string;
}

export interface ObjectionsExercise {
  id: string;
  userId: string;
  sections: ObjectionEntry[];
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated' | 'pending_validation';
  score?: number;
  maxScore: number;
  submittedAt?: string;
  updatedAt: string;
  createdAt: string;
  lastUpdated?: string;
  evaluatedAt?: string;
  evaluatedBy?: string;
  feedback?: string;
}

const OBJECTION_TYPES = {
  malentendu: 'le malentendu',
  doute: 'le doute',
  hesitation: "l'hésitation",
  desinteressement: 'le désintéressement',
  irrefutable: "l'objection irréfutable"
};

const INITIAL_OBJECTIONS: ObjectionEntry[] = [
  {
    text: "Non, cela ne m'intéresse pas car je la voulais en bleu",
    type: '',
    justification: '',
    correctType: OBJECTION_TYPES.malentendu,
    correctJustification: "je dois lui expliquer qu'il ne s'agit en fait que d'un malentendu et je doit le rassurer que notre solution/société peut répondre à ses besoins"
  },
  {
    text: "J'hésite encore... mais j'ai encore le temps",
    type: '',
    justification: '',
    correctType: OBJECTION_TYPES.hesitation,
    correctJustification: "j'aide à la décision en créant l'urgence en expliquant les bénéfices en utilisant notre solution plus rapidement"
  },
  {
    text: "Vous êtes plus cher que toute la concurrence",
    type: '',
    justification: '',
    correctType: OBJECTION_TYPES.irrefutable,
    correctJustification: "je dois absolument lui rappeler les bénéfices de la solution proposée, en les maximisant, tout en minimisant l'objection"
  },
  {
    text: "Je doute que vous soyez capable de gérer un tel projet comme le nôtre",
    type: '',
    justification: '',
    correctType: OBJECTION_TYPES.doute,
    correctJustification: "je dois lèver le doute en apportant une preuve"
  },
  {
    text: "J'hésite encore car c'est quand même un gros risque d'investir 10 millions",
    type: '',
    justification: '',
    correctType: OBJECTION_TYPES.hesitation,
    correctJustification: "j'aide à la décision en lui proposant de prendre une décision sur une partie de la solution (et pas toute la solution)"
  },
  {
    text: "Désolé, mais finalement, je ne suis plus intéressé",
    type: '',
    justification: '',
    correctType: OBJECTION_TYPES.desinteressement,
    correctJustification: "il ne me reste plus qu'à challenger le client et si nécessaire qu'il m'explique la vraie raison de ce désintéressement"
  },
  {
    text: "Je vous aurais bien choisi, mais on a une règle interne qui nous empêche de pouvoir vous choisir",
    type: '',
    justification: '',
    correctType: OBJECTION_TYPES.irrefutable,
    correctJustification: "je dois absolument lui rappeler les bénéfices de la solution proposée, en les maximisant, tout en minimisant l'objection"
  },
  {
    text: "J'ai choisi votre concurrent. Je ne le connais pas du tout mais je pense qu'il est bon.",
    type: '',
    justification: '',
    correctType: OBJECTION_TYPES.hesitation,
    correctJustification: "j'aide à la décision en donnant un fait concret sur la solution concurrente sans dénigrer et de manière éthique"
  },
  {
    text: "Je sais que vous n'en avez pas beaucoup mais je doit encore réfléchir",
    type: '',
    justification: '',
    correctType: OBJECTION_TYPES.hesitation,
    correctJustification: "j'aide à la décision en lui demandant ce qu'il lui manque pour prendre une décision maintenant"
  },
  {
    text: "Je l'aurais bien prise, mais j'aurais préféré qu'elle ait 10cm en plus",
    type: '',
    justification: '',
    correctType: OBJECTION_TYPES.irrefutable,
    correctJustification: "je dois absolument lui rappeler les bénéfices de la solution proposée, en les maximisant, tout en minimisant l'objection"
  }
];

const OBJECTIONS_CONFIG = INITIAL_OBJECTIONS;

function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

export const objectionsService = {
  async getExercise(userId: string): Promise<ObjectionsExercise> {
    if (!userId) throw new Error('User ID is required');

    try {
      const docRef = doc(db, `users/${userId}/exercises/objections`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as ObjectionsExercise;
      }

      // Create a new exercise if it doesn't exist
      const newExercise: ObjectionsExercise = {
        id: 'objections',
        userId,
        status: 'not_started',
        sections: OBJECTIONS_CONFIG,
        maxScore: 40,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, newExercise);
      return newExercise;
    } catch (error) {
      console.error('Error getting objections exercise:', error);
      throw error;
    }
  },

  async updateExercise(userId: string, exercise: ObjectionsExercise) {
    const docRef = doc(db, `users/${userId}/exercises/objections`);
    const hasAnswers = exercise.sections.some(section => section.type !== '' || section.justification !== '');
    
    if (exercise.status === 'not_started' && hasAnswers) {
      exercise.status = 'in_progress';
    }
    
    exercise.updatedAt = new Date().toISOString();
    
    await setDoc(docRef, cleanUndefined(exercise));
  },

  async submitExercise(userId: string) {
    const docRef = doc(db, `users/${userId}/exercises/objections`);
    const exercise = await this.getExercise(userId);
    
    exercise.status = 'submitted';
    exercise.submittedAt = new Date().toISOString();
    exercise.score = this.calculateScore(exercise);
    exercise.updatedAt = new Date().toISOString();
    
    await setDoc(docRef, cleanUndefined(exercise));
  },

  calculateScore(exercise: ObjectionsExercise): number {
    let totalScore = 0;
    
    exercise.sections.forEach(section => {
      if (section.type === section.correctType) {
        totalScore += 2.5;
      }
      if (section.justification === section.correctJustification) {
        totalScore += 2.5;
      }
    });

    return totalScore;
  },

  subscribeToExercise(userId: string, callback: (exercise: ObjectionsExercise) => void) {
    const docRef = doc(db, `users/${userId}/exercises/objections`);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as ObjectionsExercise);
      }
    });
  }
};
