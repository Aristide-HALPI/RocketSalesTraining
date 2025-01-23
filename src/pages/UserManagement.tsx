import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import { Button } from '../components/ui/button';
import { Archive, Trash2, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UserManagement() {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      // Only trainers can manage learners
      if (userProfile?.role !== 'trainer' && userProfile?.role !== 'admin') return;

      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'learner')
        );
        const snapshot = await getDocs(q);
        const usersData = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as User[];
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [userProfile]);

  const updateUserStatus = async (userId: string, newStatus: User['status']) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus
      });
      setUsers(users.map(user => 
        user.uid === userId ? { ...user, status: newStatus } : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  // Only trainers and admins can access this page
  if (userProfile?.role !== 'trainer' && userProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
            <div className="max-w-md mx-auto">
              <div className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <p>You do not have permission to access this page.</p>
                  <p>
                    <Link to="/" className="text-teal-600 hover:text-teal-500">
                      Return to Dashboard
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading users...</div>
      </div>
    );
  }

  // Sort users by role (admin first, then trainer, then learner)
  const sortedUsers = users.sort((a, b) => {
    const roleOrder = { admin: 0, trainer: 1, learner: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            User Management
          </h1>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedUsers.map((user) => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'actif'
                            ? 'bg-green-100 text-green-800'
                            : user.status === 'archivé'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {user.status !== 'actif' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserStatus(user.uid, 'actif')}
                          className="text-green-600 hover:text-green-700"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Activate
                        </Button>
                      )}
                      {user.status === 'actif' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserStatus(user.uid, 'archivé')}
                          className="text-yellow-600 hover:text-yellow-700"
                        >
                          <Archive className="h-4 w-4 mr-1" />
                          Archive
                        </Button>
                      )}
                      {user.status !== 'supprimé' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserStatus(user.uid, 'supprimé')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}