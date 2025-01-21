import { FC } from 'react';

interface BackButtonProps {
  onClick?: () => void;
}

export const BackButton: FC<BackButtonProps> = ({ onClick }) => {
  return (
    <div className="py-4">
      <button
        onClick={onClick}
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
      </button>
    </div>
  );
};
