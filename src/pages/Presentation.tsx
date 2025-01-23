import { ExerciseTemplate } from '../components/ExerciseTemplate';

export default function Presentation() {
  return (
    <ExerciseTemplate
      title="Présentation de votre société"
      description="Techniques pour présenter efficacement votre entreprise"
    >
      {/* Contenu spécifique à l'exercice */}
      <div>
        <p>Contenu de l'exercice à venir...</p>
      </div>
    </ExerciseTemplate>
  );
}
