import path from "node:path";

export function normalizeOutputImagePath(p: string): string {
  const full = path.resolve(p);
  const ext = path.extname(full);
  if (ext) return full;
  return `${full}.jpg`;
}

export function detectImageExtension(data: Uint8Array): ".png" | ".jpg" | ".webp" | ".gif" | null {
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return ".png";
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return ".jpg";
  }
  if (
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return ".webp";
  }
  if (
    data.length >= 6 &&
    data[0] === 0x47 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x38 &&
    (data[4] === 0x37 || data[4] === 0x39) &&
    data[5] === 0x61
  ) {
    return ".gif";
  }
  return null;
}

export function withDetectedImageExtension(outputPath: string, imageData: Uint8Array): string {
  const detected = detectImageExtension(imageData);
  if (!detected) return outputPath;

  const currentExt = path.extname(outputPath).toLowerCase();
  if (!currentExt) return `${outputPath}${detected}`;

  const normalizedCurrent = currentExt === ".jpeg" ? ".jpg" : currentExt;
  if (normalizedCurrent === detected) return outputPath;

  const corrected = `${outputPath.slice(0, -currentExt.length)}${detected}`;
  console.error(`Warning: Output extension ${currentExt} does not match image format ${detected}, saved as ${corrected}`);
  return corrected;
}
