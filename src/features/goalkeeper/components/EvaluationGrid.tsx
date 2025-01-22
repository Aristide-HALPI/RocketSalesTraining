import React from 'react';
import { EvaluationCriterion, GOALKEEPER_EVALUATION_CRITERIA } from '../types';

interface EvaluationGridProps {
  isFormateur: boolean;
  evaluation?: {
    criteria: EvaluationCriterion[];
    totalScore: number;
    evaluatedBy?: string;
    evaluatedAt?: string;
  };
  onUpdateScore?: (criterionId: string, subCriterionId: string, score: number) => void;
  onUpdateFeedback?: (criterionId: string, subCriterionId: string, feedback: string) => void;
}

export const EvaluationGrid: React.FC<EvaluationGridProps> = ({
  isFormateur,
  evaluation,
  onUpdateScore,
  onUpdateFeedback,
}) => {
  const defaultCriteria = React.useMemo(() => {
    return GOALKEEPER_EVALUATION_CRITERIA.map(criterion => ({
      ...criterion,
      subCriteria: criterion.subCriteria.map(sub => ({
        ...sub,
        score: 0,
        feedback: ''
      }))
    }));
  }, []);

  const criteria = evaluation?.criteria || defaultCriteria;

  const getCriterionScore = (criterion: EvaluationCriterion) => {
    return criterion.subCriteria?.reduce((sum, sub) => sum + (sub.score || 0), 0) || 0;
  };

  const totalMaxPoints = GOALKEEPER_EVALUATION_CRITERIA.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  const totalScore = evaluation?.totalScore || 0;
  const scoreOn20 = Math.round((totalScore / totalMaxPoints) * 20 * 10) / 10; // Conversion sur 20 avec 1 décimale

  return (
    <div className="bg-white rounded-lg shadow-sm mt-8">
      <div className="px-8 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Grille d'évaluation</h2>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {evaluation?.evaluatedBy ? (
                <>
                  <span>Évalué par {evaluation.evaluatedBy}</span>
                  <br />
                  <span>le {new Date(evaluation.evaluatedAt!).toLocaleDateString()}</span>
                </>
              ) : (
                <span>En attente d'évaluation</span>
              )}
            </div>
            <div className="text-lg font-semibold mt-1">
              Score total : {totalScore} / {totalMaxPoints} points
            </div>
            <div className="text-sm text-gray-600">
              {scoreOn20} / 20
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {criteria.map((criterion) => {
          const criterionScore = getCriterionScore(criterion);
          return (
            <div key={criterion.id} className="px-8 py-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-800">{criterion.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-600">
                    {criterionScore} / {criterion.maxPoints} points
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {criterion.subCriteria?.map((subCriterion) => (
                  <div key={subCriterion.id} className="flex items-start gap-4 bg-gray-50 p-4 rounded">
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {subCriterion.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {subCriterion.maxPoints} points
                        </span>
                      </div>
                      {isFormateur && (
                        <textarea
                          value={subCriterion.feedback || ''}
                          onChange={(e) => onUpdateFeedback?.(criterion.id, subCriterion.id, e.target.value)}
                          placeholder="Ajouter un commentaire..."
                          className="w-full mt-2 p-2 text-sm border border-gray-300 rounded resize-y focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                        />
                      )}
                      {!isFormateur && subCriterion.feedback && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          {subCriterion.feedback}
                        </p>
                      )}
                    </div>
                    {isFormateur && (
                      <div className="flex-none">
                        <input
                          type="number"
                          min="0"
                          max={subCriterion.maxPoints}
                          value={subCriterion.score || 0}
                          onChange={(e) => onUpdateScore?.(criterion.id, subCriterion.id, parseInt(e.target.value, 10))}
                          className="w-16 p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
