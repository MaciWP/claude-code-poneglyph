import { tw } from '../../lib/theme'

interface Props {
  src: string
  onClose: () => void
}

export default function ImageModal({ src, onClose }: Props): JSX.Element {
  const handleBackdropClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-full max-h-full animate-scale-in">
        <img
          src={src}
          alt="Expanded"
          className={`max-w-full max-h-[80vh] object-contain ${tw.radius.lg}`}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={onClose}
          className={`absolute top-2 right-2 w-8 h-8 ${tw.bg.tertiary} hover:bg-surface-hover text-white ${tw.radius.full} flex items-center justify-center text-xl transition-colors`}
          aria-label="Close image"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
