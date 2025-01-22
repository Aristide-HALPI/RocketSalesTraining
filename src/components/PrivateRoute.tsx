import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/user';

type Role = UserRole;

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: Role | Role[];
}

export default function PrivateRoute({ children, requiredRole }: PrivateRouteProps) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = userProfile?.role === 'admin' || 
      (userProfile?.role && roles.includes(userProfile.role as Role));
    
    if (!hasRequiredRole) {
      return <Navigate to="/" />;
    }
  }

  return <>{children}</>;
}