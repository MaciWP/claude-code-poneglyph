import { useState, useCallback } from 'react'
import type { PastedImage } from '../types/chat'

interface UseImagePasteReturn {
  pastedImages: PastedImage[]
  handlePaste: (e: React.ClipboardEvent) => Promise<void>
  addImage: (image: PastedImage) => void
  removeImage: (id: string) => void
  clearImages: () => void
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useImagePaste(): UseImagePasteReturn {
  const [pastedImages, setPastedImages] = useState<PastedImage[]>([])

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const dataUrl = await fileToDataUrl(file)
          setPastedImages(prev => [...prev, {
            id: crypto.randomUUID(),
            dataUrl,
            file,
          }])
        }
      }
    }
  }, [])

  const addImage = useCallback((image: PastedImage) => {
    setPastedImages(prev => [...prev, image])
  }, [])

  const removeImage = useCallback((id: string) => {
    setPastedImages(prev => prev.filter(img => img.id !== id))
  }, [])

  const clearImages = useCallback(() => {
    setPastedImages([])
  }, [])

  return {
    pastedImages,
    handlePaste,
    addImage,
    removeImage,
    clearImages,
  }
}
