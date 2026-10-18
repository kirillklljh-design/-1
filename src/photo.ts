export const referenceImages = [
  "mini",
  "excavator",
  "loader",
  "truck",
] as const;
export function isReferencePhoto(key: string) {
  return referenceImages.some((id) => key === `reference-${id}`);
}
export function photoUrl(key: string) {
  return isReferencePhoto(key)
    ? `/assets/photos/${key.slice(10)}.svg`
    : `/media/${key}`;
}
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
export function photoExtension(bytes: Uint8Array, type: string) {
  if (
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff &&
    type === "image/jpeg"
  )
    return "jpg";
  if (
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10 &&
    type === "image/png"
  )
    return "png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" &&
    type === "image/webp"
  )
    return "webp";
  return null;
}
