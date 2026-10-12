import path from 'path';

/**
 * Sanitizes a title into a safe filename.
 * Strips path separators, control characters, Windows/Linux reserved names, and dangerous extensions.
 */
export function sanitizeFileName(rawTitle: string, defaultExt: string = 'mp4'): string {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return `video_${Date.now()}.${defaultExt}`;
  }

  // Remove control characters and path traversal characters
  let clean = rawTitle
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\.\.+/g, '_')
    .trim();

  // Strip leading/trailing dots or spaces
  clean = clean.replace(/^[. ]+|[. ]+$/g, '');

  // Truncate to reasonable length (e.g. 100 chars)
  if (clean.length > 100) {
    clean = clean.substring(0, 100).trim();
  }

  // Check reserved DOS names on Windows (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  const reservedRegex = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reservedRegex.test(clean) || clean.length === 0) {
    clean = `media_${Date.now()}`;
  }

  // Ensure safe extension
  const safeExts = ['mp4', 'webm', 'mkv', 'm4a', 'mp3'];
  const ext = defaultExt.replace(/^\./, '').toLowerCase();
  const validExt = safeExts.includes(ext) ? ext : 'mp4';

  if (!clean.toLowerCase().endsWith(`.${validExt}`)) {
    clean = `${clean}.${validExt}`;
  }

  return clean;
}

/**
 * Validates that an internal path is strictly contained within the allowed storage directory.
 */
export function isPathSafe(baseDir: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}
