import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Meeting() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      // Rediriger vers rdv-decideur avec l'ID de l'utilisateur courant
      navigate(`/rdv-decideur?userId=${currentUser.uid}`);
    }
  }, [currentUser, navigate]);

  return null; // Ce composant ne rend rien, il ne fait que rediriger
}
