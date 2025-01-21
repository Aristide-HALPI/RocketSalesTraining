"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeFirebaseData = initializeFirebaseData;
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../lib/firebase");
var exercises = [
    {
        id: 'ex1',
        title: 'Découverte et Qualification',
        description: 'Apprendre à découvrir et qualifier les besoins du client',
        duration: 30,
        status: 'active',
        order: 1,
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    },
    {
        id: 'ex2',
        title: 'Écoute Active',
        description: 'Techniques d\'écoute active et de reformulation',
        duration: 45,
        status: 'active',
        order: 2,
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    },
    {
        id: 'ex3',
        title: 'Argumentation',
        description: 'Construction d\'une argumentation persuasive',
        duration: 60,
        status: 'active',
        order: 3,
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    }
    // ... Ajoutez les 13 autres exercices ici
];
var sampleUsers = [
    {
        uid: 'trainer1',
        email: 'trainer@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        role: 'formateur',
        status: 'actif',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        permissions: {
            canManageExercises: true,
            canManageUsers: true,
            canEvaluate: true
        },
        settings: {
            notifications: true,
            language: 'fr',
            theme: 'light'
        },
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: 1
        }
    },
    {
        uid: 'learner1',
        email: 'learner@example.com',
        firstName: 'Marie',
        lastName: 'Martin',
        role: 'apprenant',
        status: 'actif',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        permissions: {
            canManageExercises: false,
            canManageUsers: false,
            canEvaluate: false
        },
        settings: {
            notifications: true,
            language: 'fr',
            theme: 'light'
        },
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: 1
        }
    }
];
var sampleUserExercises = [
    {
        id: 'uex1',
        userId: 'learner1',
        exerciseId: 'ex1',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        content: 'Réponse de l\'apprenant pour l\'exercice 1...',
        score: null,
        feedback: null,
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    }
];
var evaluationCriteria = [
    {
        id: 'crit1',
        label: 'Compréhension du sujet',
        maxScore: 25,
        description: 'Évalue la compréhension globale du sujet et des enjeux'
    },
    {
        id: 'crit2',
        label: 'Qualité de l\'analyse',
        maxScore: 25,
        description: 'Évalue la profondeur et la pertinence de l\'analyse'
    },
    {
        id: 'crit3',
        label: 'Pertinence des solutions',
        maxScore: 25,
        description: 'Évalue la qualité et l\'applicabilité des solutions proposées'
    },
    {
        id: 'crit4',
        label: 'Clarté de la présentation',
        maxScore: 25,
        description: 'Évalue la clarté et la structure de la présentation'
    }
];
function initializeFirebaseData() {
    return __awaiter(this, void 0, void 0, function () {
        var exercisesCollection, _i, exercises_1, exercise, usersCollection, _a, sampleUsers_1, user, userExercisesCollection, _b, sampleUserExercises_1, userExercise, criteriaCollection, _c, evaluationCriteria_1, criterion, error_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 17, , 18]);
                    // Initialiser les exercices
                    console.log('Initialisation des exercices...');
                    exercisesCollection = (0, firestore_1.collection)(firebase_1.db, 'exercises');
                    _i = 0, exercises_1 = exercises;
                    _d.label = 1;
                case 1:
                    if (!(_i < exercises_1.length)) return [3 /*break*/, 4];
                    exercise = exercises_1[_i];
                    return [4 /*yield*/, (0, firestore_1.setDoc)((0, firestore_1.doc)(exercisesCollection, exercise.id), exercise)];
                case 2:
                    _d.sent();
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    // Initialiser les utilisateurs
                    console.log('Initialisation des utilisateurs...');
                    usersCollection = (0, firestore_1.collection)(firebase_1.db, 'users');
                    _a = 0, sampleUsers_1 = sampleUsers;
                    _d.label = 5;
                case 5:
                    if (!(_a < sampleUsers_1.length)) return [3 /*break*/, 8];
                    user = sampleUsers_1[_a];
                    return [4 /*yield*/, (0, firestore_1.setDoc)((0, firestore_1.doc)(usersCollection, user.uid), user)];
                case 6:
                    _d.sent();
                    _d.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8:
                    // Initialiser les exercices des utilisateurs
                    console.log('Initialisation des exercices utilisateurs...');
                    userExercisesCollection = (0, firestore_1.collection)(firebase_1.db, 'userExercises');
                    _b = 0, sampleUserExercises_1 = sampleUserExercises;
                    _d.label = 9;
                case 9:
                    if (!(_b < sampleUserExercises_1.length)) return [3 /*break*/, 12];
                    userExercise = sampleUserExercises_1[_b];
                    return [4 /*yield*/, (0, firestore_1.setDoc)((0, firestore_1.doc)(userExercisesCollection, userExercise.id), userExercise)];
                case 10:
                    _d.sent();
                    _d.label = 11;
                case 11:
                    _b++;
                    return [3 /*break*/, 9];
                case 12:
                    // Initialiser les critères d'évaluation
                    console.log('Initialisation des critères d\'évaluation...');
                    criteriaCollection = (0, firestore_1.collection)(firebase_1.db, 'evaluationCriteria');
                    _c = 0, evaluationCriteria_1 = evaluationCriteria;
                    _d.label = 13;
                case 13:
                    if (!(_c < evaluationCriteria_1.length)) return [3 /*break*/, 16];
                    criterion = evaluationCriteria_1[_c];
                    return [4 /*yield*/, (0, firestore_1.setDoc)((0, firestore_1.doc)(criteriaCollection, criterion.id), criterion)];
                case 14:
                    _d.sent();
                    _d.label = 15;
                case 15:
                    _c++;
                    return [3 /*break*/, 13];
                case 16:
                    console.log('Initialisation des données Firebase terminée avec succès !');
                    return [3 /*break*/, 18];
                case 17:
                    error_1 = _d.sent();
                    console.error('Erreur lors de l\'initialisation des données:', error_1);
                    throw error_1;
                case 18: return [2 /*return*/];
            }
        });
    });
}
