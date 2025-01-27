import { deleteGoalkeeperExercisesCollection } from './cleanupFirebase';

const cleanup = async () => {
  try {
    await deleteGoalkeeperExercisesCollection();
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
};

cleanup();
