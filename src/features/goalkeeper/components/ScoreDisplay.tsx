import React from 'react';

interface ScoreDisplayProps {
  totalScore: number;
  maxScore: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ totalScore, maxScore }) => {
  const scoreOn20 = Math.round((totalScore / maxScore) * 20 * 10) / 10;

  return (
    <div className="bg-purple-100 p-4 rounded-lg">
      <h2 className="text-purple-800 font-semibold mb-1">Votre score</h2>
      <p className="text-3xl font-bold text-purple-900">{scoreOn20}</p>
      <p className="text-sm text-purple-600">(max 20 points)</p>
    </div>
  );
};
