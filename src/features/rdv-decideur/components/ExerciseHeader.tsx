import React from 'react';

interface ExerciseHeaderProps {
  score: number;
  maxScore: number;
  status: string;
  isFormateur?: boolean;
}

export function ExerciseHeader({ score, maxScore, status, isFormateur }: ExerciseHeaderProps) {
  const getStatusText = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'À débuter';
      case 'in_progress':
        return 'En cours';
      case 'submitted':
        return 'En attente de correction';
      case 'evaluated':
        return 'Corrigé';
      case 'pending_validation':
        return 'En attente de validation';
      default:
        return status;
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg p-4 mb-8">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-purple-800">Votre score</h3>
          <p className="text-2xl font-bold text-purple-900">
            {score}/{maxScore}
          </p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-teal-800">Statut de l'exercice</h3>
          <p className="text-2xl font-bold text-teal-900">
            {getStatusText(status)}
          </p>
        </div>
      </div>
    </div>
  );
}
