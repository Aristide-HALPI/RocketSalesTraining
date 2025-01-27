const { db } = require('../lib/firebase');
const { collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const deleteGoalkeeperExercisesCollection = async () => {
  console.log('Starting cleanup of goalkeeper_exercises collection...');
  
  try {
    const collectionRef = collection(db, 'goalkeeper_exercises');
    const snapshot = await getDocs(collectionRef);
    
    const deletePromises = snapshot.docs.map(document => 
      deleteDoc(doc(db, 'goalkeeper_exercises', document.id))
    );
    
    await Promise.all(deletePromises);
    console.log(`Successfully deleted ${snapshot.size} documents from goalkeeper_exercises collection`);
  } catch (error) {
    console.error('Error deleting goalkeeper_exercises collection:', error);
    throw error;
  }
};

const cleanup = async () => {
  try {
    await deleteGoalkeeperExercisesCollection();
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
};

cleanup();
