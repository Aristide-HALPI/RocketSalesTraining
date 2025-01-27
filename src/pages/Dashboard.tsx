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
      duration: '5 min',
      path: '/welcome'
    },
    {
      title: 'Votre Solution',
      description: 'Décrivez votre solution pour les exercices',
      duration: '15 min',
      path: '/solution'
    },
    {
      title: "Matrice d'Eisenhower",
      description: 'Priorisez vos tâches avec la matrice d\'Eisenhower',
      duration: '20 min',
      path: '/eisenhower'
    },
    {
      title: 'Passer le Goalkeeper',
      description: 'Exercice de vente avec la méthode Goalkeeper',
      duration: '25 min',
      path: '/goalkeeper'
    },
    {
      title: 'Les 3 sections',
      description: 'Exercice sur les motivateurs, caractéristiques et concepts de vente',
      duration: '30 min',
      path: '/sections'
    },
    {
      title: 'RDV avec le Décideur',
      description: 'Simulation d\'un rendez-vous avec un décideur',
      duration: '35 min',
      path: '/meeting'
    },
    {
      title: '(s\')IIEP',
      description: 'Méthode IIEP pour structurer votre approche commerciale',
      duration: '40 min',
      path: '/iiep'
    },
    {
      title: 'Présentation de votre société',
      description: 'Techniques pour présenter efficacement votre entreprise',
      duration: '35 min',
      path: '/presentation'
    },
    {
      title: 'EOMBUS-PAF-I',
      description: 'Apprenez à structurer votre approche commerciale',
      duration: '120 min',
      path: '/eombus-pafi'
    },
    {
      title: 'Les 3 Qlés',
      description: 'Points clés de la négociation',
      duration: '90 min',
      path: '/cles'
    },
    {
      title: 'CDAB',
      description: 'Apprenez à structurer votre discours avec la méthode CDAB',
      duration: '25 min',
      path: '/cdab'
    },
    {
      title: 'OUTIL CDAB',
      description: 'Mettez en pratique la méthode CDAB sur différents scénarios',
      duration: '35 min',
      path: '/cdab-practice'
    },
    {
      title: 'Objections',
      description: 'Gestion des objections clients',
      duration: '90 min',
      path: '/objections'
    },
    {
      title: 'Points Bonus',
      description: 'Techniques avancées et cas spéciaux',
      duration: '60 min',
      path: '/bonus'
    },
    {
      title: 'Points - Jeu de Rôle final',
      description: 'Mise en situation finale pour valider les acquis',
      duration: '60 min',
      path: '/roleplay'
    },
    {
      title: 'Certification',
      description: 'Bilan des résultats et certification finale',
      duration: '10 min',
      path: '/certification'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Rocket Sales Training
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
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-medium text-gray-900">
                  {exercise.title}
                </h3>
                <p className="mt-2 text-base text-gray-500">
                  {exercise.description}
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
                {exercise.duration}
              </span>
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