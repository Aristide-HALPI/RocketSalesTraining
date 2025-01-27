type ExerciseHeaderProps = {
  title: string;
  subtitle?: string;
  status: string;
  score?: number;
  maxScore?: number;
  isFormateur?: boolean;
  onSave?: () => void;
  onSubmit?: () => void;
  onEvaluate?: () => void;
  onAIEvaluate?: () => void;
};

export default function ExerciseHeader({
  title,
  subtitle,
  status,
  score,
  maxScore,
  isFormateur,
  onSave,
  onSubmit,
  onEvaluate,
  onAIEvaluate
}: ExerciseHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
          <div className="mt-2 flex items-center space-x-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {status}
            </span>
            {typeof score !== 'undefined' && typeof maxScore !== 'undefined' && (
              <span className="text-sm text-gray-600">
                Score: {score}/{maxScore}
              </span>
            )}
          </div>
        </div>
        
        {isFormateur && (
          <div className="flex space-x-3">
            {onAIEvaluate && (
              <button
                onClick={onAIEvaluate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Évaluation IA
              </button>
            )}
            {onEvaluate && (
              <button
                onClick={onEvaluate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Évaluer
              </button>
            )}
            {onSave && (
              <button
                onClick={onSave}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Sauvegarder
              </button>
            )}
            {onSubmit && (
              <button
                onClick={onSubmit}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Publier
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
