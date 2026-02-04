/**
 * Validation utilities for user inputs and data
 */

export function isValidUsername(username: string): boolean {
  // Instagram username rules: 1-30 chars, alphanumeric, dots, underscores
  const regex = /^[a-zA-Z0-9._]{1,30}$/;
  return regex.test(username);
}

export function sanitizeUsername(username: string): string {
  // Remove @ symbol and trim
  return username.replace('@', '').trim().toLowerCase();
}

export function isValidCaption(caption: string, maxLength = 2200): boolean {
  return caption.length <= maxLength;
}

export function isValidVideoFile(uri: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
  return videoExtensions.some(ext => uri.toLowerCase().endsWith(ext));
}

export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex);
  return matches || [];
}

export function extractMentions(text: string): string[] {
  const mentionRegex = /@[\w.]+/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(m => m.replace('@', '')) : [];
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validateAccountData(data: any): boolean {
  return (
    data &&
    typeof data.username === 'string' &&
    isValidUsername(data.username) &&
    typeof data.id === 'string' &&
    data.id.length > 0
  );
}
