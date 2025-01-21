import { FC } from 'react';
import { ScoringCriteria } from '../types/goalkeeper';

interface GoalkeeperEvaluationProps {
  criteria: ScoringCriteria[];
  onUpdateCriteria: (criteria: ScoringCriteria[]) => void;
  globalFeedback: string;
  onUpdateGlobalFeedback: (feedback: string) => void;
  isFormateur: boolean;
}

export const GoalkeeperEvaluation: FC<GoalkeeperEvaluationProps> = ({
  criteria,
  onUpdateCriteria,
  globalFeedback,
  onUpdateGlobalFeedback,
  isFormateur
}) => {
  const handleScoreChange = (index: number, score: number) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], score };
    onUpdateCriteria(newCriteria);
  };

  const handleFeedbackChange = (index: number, feedback: string) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], feedback };
    onUpdateCriteria(newCriteria);
  };

  // Si pas de critères, ne rien afficher
  if (!criteria || criteria.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Critères d'évaluation */}
      {criteria.map((criterion, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-start">
            {/* Critère et sous-critères (côté gauche) */}
            <div className="flex-1 pr-6">
              <div className="mb-4">
                <h4 className="text-xl font-bold text-gray-800">
                  {criterion.name}
                  <span className="text-gray-600 text-base ml-2">
                    (max {criterion.maxPoints} points)
                  </span>
                </h4>
                <p className="text-gray-600 mb-4">{criterion.description}</p>
              </div>

              {/* Sous-critères avec leurs points */}
              <div className="space-y-3">
                {criterion.subCriteria.map((subCriterion, subIndex) => (
                  <div key={subIndex} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                    <span className="text-gray-700">{subCriterion.name}</span>
                    <span className="font-semibold text-blue-600">{subCriterion.points} pts</span>
                  </div>
                ))}
              </div>

              {/* Zone de notation */}
              <div className="mt-4 flex items-center">
                {isFormateur ? (
                  <div className="flex items-center space-x-2">
                    <select
                      value={criterion.score || 0}
                      onChange={(e) => handleScoreChange(index, Number(e.target.value))}
                      className="p-2 border rounded-lg text-lg font-semibold text-blue-600 bg-blue-50"
                    >
                      {criterion.scoreOptions.map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                    <span className="text-xl font-semibold text-gray-600">
                      / {criterion.maxPoints}
                    </span>
                  </div>
                ) : (
                  criterion.score !== undefined && (
                    <div className="text-2xl font-bold text-blue-600">
                      {criterion.score} / {criterion.maxPoints}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Zone de commentaire (côté droit) */}
            <div className="w-1/3 pl-6 border-l">
              <h5 className="font-semibold text-gray-700 mb-2">Commentaires :</h5>
              {isFormateur ? (
                <textarea
                  value={criterion.feedback || ''}
                  onChange={(e) => handleFeedbackChange(index, e.target.value)}
                  placeholder="Ajoutez vos commentaires ici..."
                  className="w-full p-3 border rounded-lg text-sm min-h-[150px] resize-none"
                />
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg min-h-[150px] whitespace-pre-wrap">
                  {criterion.feedback || 'Aucun commentaire'}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Commentaire global */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h4 className="text-xl font-bold text-gray-800 mb-4">Commentaire global</h4>
        {isFormateur ? (
          <textarea
            value={globalFeedback}
            onChange={(e) => onUpdateGlobalFeedback(e.target.value)}
            placeholder="Ajoutez un commentaire global..."
            className="w-full p-4 border rounded-lg resize-none"
            rows={4}
          />
        ) : (
          globalFeedback && (
            <div className="bg-gray-50 p-4 rounded-lg text-gray-700 whitespace-pre-wrap">
              {globalFeedback}
            </div>
          )
        )}
      </div>
    </div>
  );
};
