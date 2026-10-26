// Phone photos are often over the 5 MB upload limit, and iPhones may supply
// HEIC, which the bucket does not accept. Re-encoding as JPEG fixes both and
// also strips EXIF metadata such as GPS, which matters for anonymous reports.
const MAX_DIMENSION_PX = 1600
const JPEG_QUALITY = 0.85

/**
 * Re-encodes a photo as a JPEG no larger than 1600 px on its longest side.
 *
 * The browser applies the photo's EXIF rotation while decoding, so the result
 * is upright.
 *
 * @param {File} file Image picked by the user.
 * @returns {Promise<Blob>} JPEG blob (`type` is `image/jpeg`).
 * @throws {Error} When the browser cannot decode or encode the image.
 */
export async function resizePhoto(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('Could not process the photo')
  return blob
}
