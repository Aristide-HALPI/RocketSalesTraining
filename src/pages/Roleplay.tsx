import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Roleplay() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      // Rediriger vers points-role-final avec l'ID de l'utilisateur courant
      navigate(`/points-role-final?userId=${currentUser.uid}`);
    }
  }, [currentUser, navigate]);

  return null; // Ce composant ne rend rien, il ne fait que rediriger
}
