import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { User } from '../types/user';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUsers = async () => {
    try {
      console.log('Loading users...');
      setLoading(true);
      const allUsers = await userService.getAllUsers();
      console.log('Loaded users:', allUsers);
      setUsers(allUsers);
      setError(null);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err : new Error('Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useUsers effect running');
    loadUsers();
  }, []);

  return {
    users,
    loading,
    error,
    refreshUsers: loadUsers
  };
}
