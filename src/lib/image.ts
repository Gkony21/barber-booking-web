/**
 * Shrinks a photo in the browser before upload: the longest side becomes at most `maxSide`
 * and it is saved as JPEG. Phones produce 5–15 MB photos; this makes uploads fast on mobile
 * data. The server re-processes everything anyway, so this is only an optimisation.
 */
export async function prepareImage(file: File, maxSide = 1600): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file

  let bitmap: ImageBitmap
  try {
    // 'from-image' applies the phone's rotation, so portrait photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new UnsupportedImageError()
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) return file
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.85))
}

export class UnsupportedImageError extends Error {
  constructor() {
    super('Unsupported image')
    this.name = 'UnsupportedImageError'
  }
}
