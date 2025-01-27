import { useAuth } from '../contexts/AuthContext';

export function useFormateur() {
  const { currentUser } = useAuth();
  return currentUser?.role === 'formateur';
}
