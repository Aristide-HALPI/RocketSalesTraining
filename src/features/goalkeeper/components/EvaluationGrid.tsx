import React from 'react';
import { EvaluationCriterion } from '../types';

interface EvaluationGridProps {
  isFormateur: boolean;
  evaluation: {
    criteria: EvaluationCriterion[];
    totalScore: number;
  };
  onUpdateScore: (criterionId: string, subCriterionId: string, score: number) => void;
  onUpdateFeedback: (criterionId: string, subCriterionId: string, feedback: string) => void;
}

export const EvaluationGrid: React.FC<EvaluationGridProps> = ({
  isFormateur,
  evaluation,
  onUpdateScore,
  onUpdateFeedback
}) => {
  // Calculer le score total et le score maximum
  const totalScore = evaluation.criteria.reduce((sum, criterion) => 
    sum + criterion.subCriteria.reduce((subSum, sub) => subSum + sub.score, 0), 0);
  
  const maxScore = evaluation.criteria.reduce((sum, criterion) => 
    sum + criterion.subCriteria.reduce((subSum, sub) => subSum + sub.maxPoints, 0), 0);

  // Convertir en note sur 20
  const scoreOn20 = Math.round((totalScore / maxScore) * 20 * 10) / 10;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Grille d'évaluation</h2>
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-800">
            Score total : {totalScore} / {maxScore} points
          </div>
          <div className="text-sm text-gray-600">
            {scoreOn20} / 20
          </div>
        </div>
      </div>

      {evaluation.criteria.map((criterion) => (
        <div key={criterion.id} className="mb-8">
          <h3 className="text-lg font-medium text-gray-700 mb-4">{criterion.name}</h3>
          <div className="space-y-4">
            {criterion.subCriteria.map((sub) => (
              <div key={sub.id} className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-600">{sub.name}</label>
                  <div className="flex items-center gap-2">
                    {isFormateur ? (
                      <select
                        value={sub.score}
                        onChange={(e) => onUpdateScore(criterion.id, sub.id, Number(e.target.value))}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        {Array.from({ length: sub.maxPoints + 1 }, (_, i) => (
                          <option key={i} value={i}>
                            {i} / {sub.maxPoints}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm font-medium">
                        {sub.score} / {sub.maxPoints}
                      </span>
                    )}
                  </div>
                </div>
                {isFormateur && (
                  <textarea
                    value={sub.feedback}
                    onChange={(e) => onUpdateFeedback(criterion.id, sub.id, e.target.value)}
                    placeholder="Ajouter un commentaire..."
                    className="w-full p-2 text-sm border rounded"
                    rows={2}
                  />
                )}
                {!isFormateur && sub.feedback && (
                  <p className="text-sm text-gray-600 italic">{sub.feedback}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
