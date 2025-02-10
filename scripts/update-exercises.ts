import { rdvDecideurService } from '../src/features/rdv-decideur/services/rdvDecideurService';

async function main() {
  try {
    await rdvDecideurService.updateAllExercises();
    console.log('Tous les exercices ont été mis à jour avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour des exercices:', error);
    process.exit(1);
  }
}

main();
