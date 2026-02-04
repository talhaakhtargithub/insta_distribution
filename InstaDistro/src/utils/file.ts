/**
 * File handling utilities
 */

import * as FileSystem from 'expo-file-system';

export async function getFileInfo(uri: string) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info;
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
}

export async function getFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && 'size' in info ? info.size || 0 : 0;
  } catch {
    return 0;
  }
}

export function validateVideoSize(sizeBytes: number, maxMB = 500): boolean {
  const maxBytes = maxMB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

export function getFileExtension(uri: string): string {
  const parts = uri.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function isVideoFile(uri: string): boolean {
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
  const ext = getFileExtension(uri);
  return videoExtensions.includes(ext);
}

export function isImageFile(uri: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];
  const ext = getFileExtension(uri);
  return imageExtensions.includes(ext);
}

export async function convertToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    throw new Error('Failed to convert file to base64');
  }
}

export async function saveBase64ToFile(
  base64: string,
  filename: string
): Promise<string> {
  try {
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  } catch (error) {
    throw new Error('Failed to save file');
  }
}
