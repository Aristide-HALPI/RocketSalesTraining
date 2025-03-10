import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { Button } from './ui/button';

export default function Navbar() {
  const { userProfile, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="bg-teal-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold">
              <span className="text-xl font-semibold">
                Sales Hero Training
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-8 ml-10">
              {(userProfile?.role === 'admin' || userProfile?.role === 'trainer') && (
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
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {userProfile && (
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-end">
                  <span className="text-sm">{userProfile.email}</span>
                  <span className="text-xs text-gray-300">
                    {userProfile.role === 'admin' ? 'Admin' : 
                     userProfile.role === 'trainer' ? 'Formateur' : 'Apprenant'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-white hover:text-gray-200 p-2"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}