import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const data = await AsyncStorage.getItem(KEYS.ACCOUNTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveAccount(account: Account): Promise<void> {
  const accounts = await getAccounts();
  accounts.push(account);
  await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<void> {
  const accounts = await getAccounts();
  const index = accounts.findIndex(a => a.id === id);
  if (index !== -1) {
    accounts[index] = { ...accounts[index], ...updates };
    await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
  }
}

export async function deleteAccount(id: string): Promise<void> {
  const accounts = await getAccounts();
  const filtered = accounts.filter(a => a.id !== id);
  await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(filtered));
}

export async function setSourceAccount(id: string): Promise<void> {
  const accounts = await getAccounts();
  const updated = accounts.map(a => ({ ...a, isSource: a.id === id }));
  await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(updated));
  await AsyncStorage.setItem(KEYS.SOURCE_ACCOUNT, id);
}

// Videos
export async function getVideos(): Promise<Video[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.VIDEOS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveVideo(video: Video): Promise<void> {
  const videos = await getVideos();
  videos.unshift(video);
  await AsyncStorage.setItem(KEYS.VIDEOS, JSON.stringify(videos));
}

export async function updateVideo(id: string, updates: Partial<Video>): Promise<void> {
  const videos = await getVideos();
  const index = videos.findIndex(v => v.id === id);
  if (index !== -1) {
    videos[index] = { ...videos[index], ...updates };
    await AsyncStorage.setItem(KEYS.VIDEOS, JSON.stringify(videos));
  }
}

export async function deleteVideo(id: string): Promise<void> {
  const videos = await getVideos();
  const filtered = videos.filter(v => v.id !== id);
  await AsyncStorage.setItem(KEYS.VIDEOS, JSON.stringify(filtered));
}

// Onboarding
export async function isOnboardingComplete(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
  return value === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, 'true');
}

// Clear all data
export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.ACCOUNTS,
    KEYS.VIDEOS,
    KEYS.ONBOARDING_COMPLETE,
    KEYS.SOURCE_ACCOUNT,
  ]);
}
