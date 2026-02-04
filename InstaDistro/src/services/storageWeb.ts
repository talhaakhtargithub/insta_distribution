/**
 * Web-compatible storage adapter
 * Uses localStorage on web, AsyncStorage on native
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';

// Web storage adapter using localStorage
const webStorage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      keys.forEach(key => window.localStorage.removeItem(key));
    }
  },
};

// Export unified storage interface
export const storage = isWeb ? webStorage : AsyncStorage;

// Re-export types
export type { Account, Video } from './storage';

// Storage keys
const KEYS = {
  ACCOUNTS: 'insta_distro_accounts',
  VIDEOS: 'insta_distro_videos',
  ONBOARDING_COMPLETE: 'insta_distro_onboarding',
  SOURCE_ACCOUNT: 'insta_distro_source',
};

export interface Account {
  id: string;
  username: string;
  followerCount?: number;
  isSource: boolean;
  proxyConnected: boolean;
  createdAt: string;
}

export interface Video {
  id: string;
  uri: string;
  thumbnailUri?: string;
  duration: number;
  originalUri: string;
  isEdited: boolean;
  appliedEffects: string[];
  modificationPercentage: number;
  uploadedTo: string[];
  createdAt: string;
}

// Accounts
export async function getAccounts(): Promise<Account[]> {
  try {
    const data = await storage.getItem(KEYS.ACCOUNTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting accounts:', error);
    return [];
  }
}

export async function saveAccount(account: Account): Promise<void> {
  try {
    const accounts = await getAccounts();
    accounts.push(account);
    await storage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
  } catch (error) {
    console.error('Error saving account:', error);
  }
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<void> {
  try {
    const accounts = await getAccounts();
    const index = accounts.findIndex(a => a.id === id);
    if (index !== -1) {
      accounts[index] = { ...accounts[index], ...updates };
      await storage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
    }
  } catch (error) {
    console.error('Error updating account:', error);
  }
}

export async function deleteAccount(id: string): Promise<void> {
  try {
    const accounts = await getAccounts();
    const filtered = accounts.filter(a => a.id !== id);
    await storage.setItem(KEYS.ACCOUNTS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting account:', error);
  }
}

export async function setSourceAccount(id: string): Promise<void> {
  try {
    const accounts = await getAccounts();
    const updated = accounts.map(a => ({ ...a, isSource: a.id === id }));
    await storage.setItem(KEYS.ACCOUNTS, JSON.stringify(updated));
    await storage.setItem(KEYS.SOURCE_ACCOUNT, id);
  } catch (error) {
    console.error('Error setting source account:', error);
  }
}

// Videos
export async function getVideos(): Promise<Video[]> {
  try {
    const data = await storage.getItem(KEYS.VIDEOS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting videos:', error);
    return [];
  }
}

export async function saveVideo(video: Video): Promise<void> {
  try {
    const videos = await getVideos();
    videos.unshift(video);
    await storage.setItem(KEYS.VIDEOS, JSON.stringify(videos));
  } catch (error) {
    console.error('Error saving video:', error);
  }
}

export async function updateVideo(id: string, updates: Partial<Video>): Promise<void> {
  try {
    const videos = await getVideos();
    const index = videos.findIndex(v => v.id === id);
    if (index !== -1) {
      videos[index] = { ...videos[index], ...updates };
      await storage.setItem(KEYS.VIDEOS, JSON.stringify(videos));
    }
  } catch (error) {
    console.error('Error updating video:', error);
  }
}

export async function deleteVideo(id: string): Promise<void> {
  try {
    const videos = await getVideos();
    const filtered = videos.filter(v => v.id !== id);
    await storage.setItem(KEYS.VIDEOS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting video:', error);
  }
}

// Onboarding
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await storage.getItem(KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding:', error);
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  try {
    await storage.setItem(KEYS.ONBOARDING_COMPLETE, 'true');
  } catch (error) {
    console.error('Error setting onboarding complete:', error);
  }
}

// Clear all data
export async function clearAllData(): Promise<void> {
  try {
    await storage.multiRemove([
      KEYS.ACCOUNTS,
      KEYS.VIDEOS,
      KEYS.ONBOARDING_COMPLETE,
      KEYS.SOURCE_ACCOUNT,
    ]);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}
