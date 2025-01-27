import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocalEvaluation } from '../types';

interface EvaluationDisplayProps {
  evaluation: LocalEvaluation;
}

export const EvaluationDisplay: React.FC<EvaluationDisplayProps> = ({ evaluation }) => {
  if (!evaluation) return null;

  return (
    <div className="space-y-6">
      {/* Score Total */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold">Score Total</h3>
            <p className="text-4xl font-bold text-primary mt-2">{evaluation.totalScore}</p>
          </div>
        </CardContent>
      </Card>

      {/* Points Forts */}
      {evaluation.strengths && evaluation.strengths.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold mb-4">Points Forts</h3>
            <div className="space-y-2">
              {evaluation.strengths.map((strength, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge variant="success" className="mt-1">+</Badge>
                  <p>{strength}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Axes d'Amélioration */}
      {evaluation.improvements && evaluation.improvements.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold mb-4">Axes d'Amélioration</h3>
            <div className="space-y-2">
              {evaluation.improvements.map((improvement, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge variant="warning" className="mt-1">↗</Badge>
                  <p>{improvement}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Général */}
      {evaluation.generalFeedback && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold mb-4">Feedback Général</h3>
            <p className="text-gray-700">{evaluation.generalFeedback}</p>
          </CardContent>
        </Card>
      )}

      {/* Critères Détaillés */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-bold mb-4">Évaluation Détaillée</h3>
          <div className="space-y-6">
            {evaluation.criteria.map((criterion) => (
              <div key={criterion.id} className="space-y-4">
                <h4 className="text-lg font-semibold">{criterion.name}</h4>
                <div className="space-y-3 pl-4">
                  {criterion.subCriteria.map((sub) => (
                    <div key={sub.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{sub.name}</span>
                        <Badge variant={sub.score >= sub.maxPoints * 0.7 ? "success" : "warning"}>
                          {sub.score}/{sub.maxPoints}
                        </Badge>
                      </div>
                      {sub.feedback && (
                        <p className="text-sm text-gray-600">{sub.feedback}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métadonnées */}
      <div className="text-sm text-gray-500 text-right">
        <p>Évalué par: {evaluation.evaluatedBy}</p>
        <p>Le: {new Date(evaluation.evaluatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
};
