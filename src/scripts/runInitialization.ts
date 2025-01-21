#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { initializeFirebaseData } from './initializeFirebaseData.js';

// Exécuter l'initialisation
try {
  await initializeFirebaseData();
  console.log('Initialisation terminée avec succès');
  process.exit(0);
} catch (error) {
  console.error('Erreur lors de l\'initialisation:', error);
  process.exit(1);
}
