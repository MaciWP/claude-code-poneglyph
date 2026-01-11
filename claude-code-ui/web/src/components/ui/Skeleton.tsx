import { tw } from '../../lib/theme'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps): JSX.Element {
  return (
    <div
      className={`${tw.bg.tertiary} animate-pulse-skeleton rounded ${className}`}
      aria-hidden="true"
    />
  )
}

export default Skeleton
