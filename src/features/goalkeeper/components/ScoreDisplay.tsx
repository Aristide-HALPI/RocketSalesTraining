import React from 'react';
import { GOALKEEPER_EVALUATION_CRITERIA } from '../types';

interface ScoreDisplayProps {
  totalScore: number;
  maxScore: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ totalScore, maxScore }) => {
  // Calculer le score maximum selon la nouvelle grille
  const newMaxScore = GOALKEEPER_EVALUATION_CRITERIA.reduce((sum, criterion) => 
    sum + criterion.subCriteria.reduce((subSum, sub) => subSum + sub.maxPoints, 0), 0);

  // Normaliser le score total selon la nouvelle échelle
  const normalizedScore = GOALKEEPER_EVALUATION_CRITERIA.reduce((sum, criterion) => {
    const oldCriterion = criterion;
    return sum + criterion.subCriteria.reduce((subSum, sub) => {
      const oldScore = (totalScore / maxScore) * oldCriterion.maxPoints * (sub.maxPoints / oldCriterion.maxPoints);
      return subSum + Math.min(oldScore, sub.maxPoints);
    }, 0);
  }, 0);

  // Arrondir à une décimale
  const scoreOn20 = Math.round((normalizedScore / newMaxScore) * 20 * 10) / 10;
  
  console.log('Score calculation:', {
    totalScore,
    maxScore,
    scoreOn20,
    calculation: `(${normalizedScore} / ${newMaxScore}) * 20 = ${scoreOn20}`
  });

  return (
    <div className="bg-purple-100 p-4 rounded-lg">
      <h2 className="text-purple-800 font-semibold mb-1">Votre score</h2>
      <p className="text-3xl font-bold text-purple-900">{scoreOn20}</p>
      <p className="text-sm text-purple-600">(max 20 points)</p>
    </div>
  );
};
