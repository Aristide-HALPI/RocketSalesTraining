import { FC } from 'react';
import { Link } from 'react-router-dom';

const Welcome: FC = () => {
  return (
    <div className="container mx-auto px-4">
      <div className="py-4">
        <Link
          to="/"
          className="inline-flex items-center text-teal-600 hover:text-teal-700"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Retour au tableau de bord
        </Link>
      </div>

      <div className="bg-white rounded-lg w-full">
        <div className="p-8 space-y-8">
          <div className="flex justify-center w-full max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="w-full md:w-[400px]">
                <img
                  src="https://www.transformabxl.be/wp-content/uploads/2018/01/Philippe-Szombat.jpg"
                  alt="Philippe de BrightBiz"
                  className="w-full h-auto object-cover max-w-[400px]"
                />
              </div>
              <div className="w-full md:w-[280px] flex flex-col items-center justify-center">
                <img
                  src="https://www.brightbiz.eu/wp-content/uploads/2019/03/BrightBiz_logo.png"
                  alt="BrightBiz Logo"
                  className="w-full max-w-[280px]"
                />
                <p className="text-center text-teal-700 mt-4 font-medium text-lg tracking-wider uppercase">
                  Be The Best
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-8 w-full max-w-none px-4">
            <div className="border-b border-gray-200 pb-6">
              <h1 className="text-3xl font-bold text-teal-900 mb-3 text-center">
                Cher.e futur.e saleshero,
              </h1>
              <h2 className="text-2xl text-teal-800 text-center">
                Bienvenue dans vos exercices en ligne!
              </h2>
            </div>

            <div className="prose max-w-none">
              <p className="text-gray-700 text-lg">
                Je suis ravi que vous suiviez la Formation "<span className="text-teal-700 font-medium">Rocket Sales Training</span>" de BrightBiz!
                Elle vous sera utile pour toute la vie!
              </p>
              <p className="text-gray-700 text-lg">
                Afin de s'assurer que vous assimiliez au mieux la matière apprise, j'ai préparé ces exercices.
              </p>
            </div>

            <div className="bg-teal-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-teal-900 mb-6">
                Voici quelques instructions importantes:
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-teal-500"/>
                  <span className="text-gray-700">
                    Chaque exercice comptera dans la certification finale et la 
                    <span className="font-semibold text-teal-900"> CERTIFICATION COSSIM®</span> de BrightBiz.
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-teal-500"/>
                  <span className="text-gray-700">
                    Il est donc <span className="font-semibold text-teal-900">important</span> que vous prévoyiez 
                    suffisamment de temps pour les faire.
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-teal-500"/>
                  <span className="text-gray-700">
                    Vous aurez besoin d'environ <span className="font-semibold text-teal-900">8 à 10 heures au total</span>. 
                    Donc, prévoiyez de bloquer du temps pour les faire dans les meilleures conditions.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-lg p-6 border border-gray-200">
              <p className="text-gray-700">
                Notez que tout est automatiquement sauvegardé pour autant que vous êtes, bien sûr, connecté sur internet.
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-6">
              <p className="font-semibold text-red-700 mb-4">Attention:</p>
              <div className="space-y-4 text-gray-700">
                <p>
                  Si vous ne faites pas les exercices aux dates qui vous ont été transmises, et que vous êtes en retard, 
                  je ne pourrai plus garantir les corrections. Par conséquent, le score sera alors logiquement de 0.
                </p>
                <p>
                  Regardez bien les corrections et les remarques avant la 2ème et 3ème journée du formation svp.
                </p>
              </div>
            </div>

            <div className="rounded-lg p-6 border border-gray-200">
              <p className="text-gray-700">
                Si vous avez des questions ou si vous avez besoin d'aide, vous pouvez toujours me contacter via email: 
                <a href="mailto:philippe@brightbiz.eu" className="text-teal-600 hover:text-teal-700 ml-1">
                  philippe@brightbiz.eu
                </a> 
                <span className="mx-1">ou via gsm</span>
                <a href="tel:0472807808" className="text-teal-600 hover:text-teal-700">
                  0472/807.808
                </a>.
              </p>
            </div>

            <div className="bg-emerald-50 rounded-lg p-6">
              <p className="text-gray-700">
                N'oubliez pas qu'après la formation, quand tous les exercices auront été corrigés, 
                vous pouvez toujours les <span className="text-emerald-700 font-medium">télécharger au format xls</span> et de les garder sur votre ordinateur. 
                Ainsi, vous pourrez revoir vos exercices à tout moment.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-2xl font-semibold text-teal-900 text-center">
                Je vous souhaite plein de succès dans vos exercices!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
