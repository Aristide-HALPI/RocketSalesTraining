import { FC, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Card: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm',
        className
      )}
      {...props}
    />
  )
}

Card.displayName = 'Card'
