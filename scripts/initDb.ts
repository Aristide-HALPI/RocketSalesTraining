import { initializeSystemSettings } from '../src/utils/initializeDatabase';

async function main() {
  console.log('Début de l\'initialisation de la base de données...');
  
  // Initialisation des paramètres système
  const systemSettingsResult = await initializeSystemSettings();
  if (systemSettingsResult) {
    console.log('✅ Paramètres système initialisés');
  } else {
    console.log('❌ Échec de l\'initialisation des paramètres système');
  }

  console.log('Fin de l\'initialisation de la base de données');
  process.exit(0);
}

main().catch(error => {
  console.error('Erreur lors de l\'initialisation:', error);
  process.exit(1);
});
