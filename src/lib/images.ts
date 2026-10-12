import imageCompression from 'browser-image-compression'

/**
 * Shrink photos picked from the library to roughly the same size as in-app
 * camera shots (≤1280px JPEG) so uploads stay small. Falls back to the
 * original file if compression fails (e.g. an unsupported format).
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(
    files.map(async (f) => {
      try {
        return await imageCompression(f, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          fileType: 'image/jpeg',
        })
      } catch {
        return f
      }
    }),
  )
}
