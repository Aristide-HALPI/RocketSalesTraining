import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { CheckCircle, BookOpen, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Dashboard() {
  const { userProfile } = useAuth();

  const stats = [
    {
      title: 'Exercices complétés',
      value: '0',
      icon: CheckCircle,
      color: 'text-teal-600',
      link: userProfile?.role === 'trainer' ? '/evaluations' : '/exercises'
    },
    {
      title: userProfile?.role === 'trainer' ? 'Exercices à évaluer' : 'Exercices disponibles',
      value: '16',
      icon: BookOpen,
      color: 'text-teal-600',
      link: userProfile?.role === 'trainer' ? '/evaluations/pending' : '/exercises/available'
    },
    {
      title: userProfile?.role === 'trainer' ? 'Temps moyen d\'évaluation' : 'Temps d\'apprentissage',
      value: '0.0h',
      icon: Clock,
      color: 'text-teal-600',
      link: userProfile?.role === 'trainer' ? '/statistics/evaluation' : '/statistics/learning'
    }
  ];

  const exercises = [
    {
      title: 'Bienvenue',
      description: 'Message de bienvenue et instructions générales',
      path: '/welcome'
    },
    {
      title: 'Votre Solution',
      description: 'Décrivez votre solution pour les exercices',
      path: '/solution'
    },
    {
      title: "Matrice d'Eisenhower",
      description: 'Priorisez vos tâches avec la matrice d\'Eisenhower',
      path: '/eisenhower'
    },
    {
      title: 'Passer le Goalkeeper',
      description: 'Exercice de vente avec la méthode Goalkeeper',
      path: '/goalkeeper'
    },
    {
      title: 'Les 3 sections',
      description: 'Exercice sur les motivateurs, caractéristiques et concepts de vente',
      path: '/sections'
    },
    {
      title: 'RDV avec le Décideur',
      description: 'Simulation d\'un rendez-vous avec un décideur',
      path: '/meeting'
    },
    {
      title: '(s\')IIEP',
      description: 'Méthode IIEP pour structurer votre approche commerciale',
      path: '/iiep'
    },
    {
      title: 'Présentation de votre société',
      description: 'Techniques pour présenter efficacement votre entreprise',
      path: '/presentation'
    },
    {
      title: 'EOMBUS-PAF-I',
      description: 'Apprenez à structurer votre approche commerciale',
      path: '/eombus-pafi'
    },
    {
      title: 'Les 3 Qlés',
      description: 'Points clés de la négociation',
      path: '/cles'
    },
    {
      title: 'CDAB',
      description: 'Apprenez à structurer votre discours avec la méthode CDAB',
      path: '/cdab'
    },
    {
      title: 'OUTIL CDAB',
      description: 'Mettez en pratique la méthode CDAB sur différents scénarios',
      path: '/cdab-practice'
    },
    {
      title: 'Objections',
      description: 'Gestion des objections clients',
      path: '/objections'
    },
    {
      title: 'Points Bonus',
      description: 'Techniques avancées et cas spéciaux',
      path: '/bonus'
    },
    {
      title: 'Points - Jeu de Rôle final',
      description: 'Mise en situation finale pour valider les acquis',
      path: '/roleplay'
    },
    {
      title: 'Certification',
      description: 'Bilan des résultats et certification finale',
      path: '/certification'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Sales Hero Training
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Bienvenue dans votre parcours de formation commerciale
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <Link
            key={index}
            to={stat.link || '#'}
            className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
        {exercises.map((exercise, index) => (
          <div
            key={index}
            className="bg-white overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-200 p-8"
          >
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-semibold">
                  {index + 1}
                </span>
                <h3 className="text-xl font-medium text-gray-900">
                  {exercise.title}
                </h3>
              </div>
              <p className="mt-2 text-base text-gray-500">
                {exercise.description}
              </p>
            </div>
            <div>
              <Link to={exercise.path}>
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white px-6"
                >
                  Commencer
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}