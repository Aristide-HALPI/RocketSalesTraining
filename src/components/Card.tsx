import { FC, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`rounded-lg ${className}`}>
      {children}
    </div>
  );
};

export const CardContent: FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};
