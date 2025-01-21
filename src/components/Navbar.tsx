import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, BookOpen, Users, LogOut } from 'lucide-react';
import { Button } from './ui/button';

export default function Navbar() {
  const { userProfile, logout } = useAuth();
  const location = useLocation();
  const isFormateur = userProfile?.role === 'formateur';
  const isAdmin = userProfile?.role === 'admin';
  const canAccessMembers = isFormateur || isAdmin;

  return (
    <nav className="bg-teal-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold">
              Rocket Sales Training
            </Link>
            <div className="hidden md:flex items-center space-x-8 ml-10">
              <Link
                to="/"
                className="text-white hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
              {(userProfile?.role === 'admin' || userProfile?.role === 'formateur') && (
                <>
                  <Link
                    to="/member-management"
                    className={`${
                      location.pathname === '/member-management'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } px-3 py-2 rounded-md text-sm font-medium`}
                  >
                    Gestion des membres
                  </Link>
                  <Link
                    to="/evaluation-settings"
                    className={`${
                      location.pathname === '/evaluation-settings'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } px-3 py-2 rounded-md text-sm font-medium`}
                  >
                    Paramètres d'évaluation
                  </Link>
                </>
              )}
              {isFormateur && (
                <Link
                  to="/exercises"
                  className="text-white hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Exercices
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {userProfile && (
              <div className="text-sm text-white mr-4">
                {userProfile.email}
                {isFormateur && (
                  <span className="ml-2 px-2 py-1 bg-teal-700 rounded text-xs">
                    Formateur
                  </span>
                )}
                {isAdmin && (
                  <span className="ml-2 px-2 py-1 bg-purple-700 rounded text-xs">
                    Admin
                  </span>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              onClick={logout}
              className="text-white hover:text-gray-200 flex items-center"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}