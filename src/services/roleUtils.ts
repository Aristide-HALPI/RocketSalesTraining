import { UserRole } from '../types/database';

// Fonction pour convertir les anciens rôles en nouveaux rôles
export function convertLegacyRole(role: string): UserRole {
  if (role === 'learner' || role === 'apprenant') return 'learner';
  if (role === 'trainer' || role === 'formateur') return 'trainer';
  if (role === 'admin') return 'admin';
  return 'learner'; // Rôle par défaut
}

// Fonction pour obtenir les permissions par défaut selon le rôle
export function getDefaultPermissions(role: UserRole) {
  switch (role) {
    case 'admin':
      return {
        canManageExercises: true,
        canManageUsers: true,
        canEvaluate: true
      };
    case 'trainer':
      return {
        canManageExercises: true,
        canManageUsers: false,
        canEvaluate: true
      };
    case 'learner':
    default:
      return {
        canManageExercises: false,
        canManageUsers: false,
        canEvaluate: false
      };
  }
}
