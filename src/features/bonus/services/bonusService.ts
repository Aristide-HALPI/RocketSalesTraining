import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface BonusTask {
  text: string;
  url: string;
  completed: boolean;
  score?: number;
}

export interface BonusExercise {
  userId: string;
  tasks: BonusTask[];
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated';
  totalScore?: number;
  maxScore: number;
  submittedAt?: string;
  updatedAt: string;
  createdAt: string;
  lastUpdated?: string;
  evaluatedAt?: string;
  evaluatedBy?: string;
}

const INITIAL_TASKS: BonusTask[] = [
  {
    text: "Écrivez une review sur notre page Google (4* ou 5* sont les bienvenus 😊)",
    url: "https://search.google.com/local/writereview?placeid=ChIJrx6EZjHFw0cRhPW6wDoTOc8",
    completed: false
  },
  {
    text: "Souscrivez à notre chaîne Youtube",
    url: "https://www.youtube.com/c/brightbiz",
    completed: false
  },
  {
    text: "Suivez-nous sur LinkedIn",
    url: "https://www.linkedin.com/school/10206797/admin/",
    completed: false
  },
  {
    text: "Connectez-vous sur notre page Facebook",
    url: "https://www.facebook.com/brightbiz.eu",
    completed: false
  },
  {
    text: "Rejoignez notre communauté #BeSales",
    url: "https://www.facebook.com/groups/besales/?source_id=722572747876369",
    completed: false
  }
];

function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

export const bonusService = {
  async getExercise(userId: string): Promise<BonusExercise> {
    const docRef = doc(db, `users/${userId}/exercises`, 'bonus');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const exercise = docSnap.data() as BonusExercise;
      // Si aucune tâche n'est complétée, on remet le statut à not_started
      const hasCompletedTasks = exercise.tasks.some(task => task.completed);
      if (!hasCompletedTasks && exercise.status === 'in_progress') {
        exercise.status = 'not_started';
        await setDoc(docRef, cleanUndefined(exercise));
      }
      return exercise;
    }

    const newExercise: BonusExercise = {
      userId,
      tasks: INITIAL_TASKS,
      status: 'not_started',
      maxScore: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    await setDoc(docRef, cleanUndefined(newExercise));
    return newExercise;
  },

  async updateExercise(userId: string, exercise: BonusExercise) {
    const docRef = doc(db, `users/${userId}/exercises`, 'bonus');
    const hasCompletedTasks = exercise.tasks.some(task => task.completed);
    
    if (exercise.status === 'not_started' && hasCompletedTasks) {
      exercise.status = 'in_progress';
    }
    
    exercise.updatedAt = new Date().toISOString();
    exercise.lastUpdated = new Date().toISOString();
    
    await setDoc(docRef, cleanUndefined(exercise));
  },

  async submitExercise(userId: string) {
    const docRef = doc(db, `users/${userId}/exercises`, 'bonus');
    const exercise = await this.getExercise(userId);
    
    exercise.status = 'submitted';
    exercise.submittedAt = new Date().toISOString();
    exercise.updatedAt = new Date().toISOString();
    exercise.lastUpdated = new Date().toISOString();
    
    await setDoc(docRef, cleanUndefined(exercise));
  },

  async evaluateExercise(userId: string, evaluatedTasks: BonusTask[], evaluatorId: string) {
    const docRef = doc(db, `users/${userId}/exercises`, 'bonus');
    const exercise = await this.getExercise(userId);
    
    exercise.tasks = evaluatedTasks;
    exercise.totalScore = evaluatedTasks.reduce((total, task) => total + (task.score || 0), 0);
    exercise.status = 'evaluated';
    exercise.evaluatedAt = new Date().toISOString();
    exercise.evaluatedBy = evaluatorId;
    exercise.updatedAt = new Date().toISOString();
    exercise.lastUpdated = new Date().toISOString();
    
    await setDoc(docRef, cleanUndefined(exercise));
  },

  subscribeToExercise(userId: string, callback: (exercise: BonusExercise) => void) {
    const docRef = doc(db, `users/${userId}/exercises`, 'bonus');
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as BonusExercise);
      }
    });
  }
};
