import { useNavigate } from 'react-router-dom';
import { Users, Archive, Trash2, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useUsers } from '../hooks/useUsers';
import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import type { User, UserRole } from '../types/user';
import { useAuth } from '../contexts/AuthContext';

export default function MemberManagement() {
  const { users, loading, error, refreshUsers } = useUsers();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'archive' | 'delete' | null>(null);

  useEffect(() => {
    console.log('MemberManagement rendered with:', JSON.stringify({ 
      userProfile: {
        uid: userProfile?.uid,
        email: userProfile?.email,
        role: userProfile?.role
      }
    }, null, 2));
  }, [users, loading, error, userProfile]);

  const handleViewExercises = (userId: string) => {
    navigate(`/student-exercises/${userId}`);
  };

  const handleArchive = (user: User) => {
    console.log('Archiving user:', user);
    setSelectedUser(user);
    setActionType('archive');
    setShowConfirmDialog(true);
  };

  const handleDelete = (user: User) => {
    console.log('Deleting user:', user);
    setSelectedUser(user);
    setActionType('delete');
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedUser || !actionType) return;

    try {
      console.log('Confirming action:', actionType, 'for user:', selectedUser);
      if (actionType === 'archive') {
        if (selectedUser.status === 'active') {
          await userService.archiveUser(selectedUser.uid);
        } else {
          await userService.reactivateUser(selectedUser.uid);
        }
      } else {
        await userService.deleteUser(selectedUser.uid);
      }
      await refreshUsers();
    } catch (error) {
      console.error('Error performing action:', error);
    } finally {
      setShowConfirmDialog(false);
      setSelectedUser(null);
      setActionType(null);
    }
  };

  // Vérifier si l'utilisateur actuel peut modifier un utilisateur donné
  const canModifyUser = (user: User): boolean => {
    if (!userProfile) return false;
    
    // Les admins peuvent tout faire
    if (userProfile.role === 'admin') return true;
    
    // Les formateurs peuvent seulement modifier les apprenants
    if (userProfile.role === 'trainer') {
      return user.role === 'learner';
    }
    
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    console.error('Error in MemberManagement:', error);
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erreur lors du chargement des membres</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error.message}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Gestion des Membres</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Aucun utilisateur trouvé</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Il n'y a actuellement aucun utilisateur inscrit dans le système.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trier les utilisateurs par rôle (admin en premier, puis formateur, puis apprenant)
  const sortedUsers = [...users].sort((a, b) => {
    const roleOrder: Record<UserRole, number> = {
      admin: 0,
      trainer: 1,
      learner: 2
    };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Gestion des Membres</h1>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedUsers.map((user) => (
                <tr key={user.uid}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                          <Users className="h-6 w-6 text-teal-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'trainer'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : user.role === 'trainer' ? 'Formateur' : 'Apprenant'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status === 'active' ? 'Actif' : 'Archivé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {/* Bouton Voir les exercices uniquement pour les apprenants */}
                    {user.role === 'learner' && (
                      <Button
                        onClick={() => handleViewExercises(user.uid)}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir les exercices
                      </Button>
                    )}
                    
                    {/* Boutons d'action selon les droits */}
                    {canModifyUser(user) && (
                        <>
                          <Button
                            onClick={() => handleArchive(user)}
                            className="bg-blue-600 hover:bg-blue-700 text-white ml-2"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            {user.status === 'active' ? 'Archiver' : 'Réactiver'}
                          </Button>
                          <Button
                            onClick={() => handleDelete(user)}
                            className="bg-red-600 hover:bg-red-700 text-white ml-2"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </Button>
                        </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showConfirmDialog && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4">Confirmation</h2>
            <p className="mb-6">
              {actionType === 'archive' 
                ? `Êtes-vous sûr de vouloir ${selectedUser.status === 'active' ? 'archiver' : 'réactiver'} le compte de ${selectedUser.firstName} ${selectedUser.lastName} ?`
                : `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${selectedUser.firstName} ${selectedUser.lastName} ? Cette action est irréversible et supprimera toutes les données associées.`
              }
            </p>
            <div className="flex justify-end space-x-4">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmAction}
                className={actionType === 'archive' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
