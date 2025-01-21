"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var initializeFirebaseData_1 = require("./initializeFirebaseData");
// Exécuter l'initialisation
(0, initializeFirebaseData_1.initializeFirebaseData)()
    .then(function () {
    console.log('Initialisation terminée avec succès');
    process.exit(0);
})
    .catch(function (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    process.exit(1);
});
