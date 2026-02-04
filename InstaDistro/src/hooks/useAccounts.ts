import { useState, useCallback } from 'react';
import {
  getAccounts,
  saveAccount,
  updateAccount,
  deleteAccount,
  setSourceAccount as setSource,
  Account,
} from '../services/storage';
import { backendApi } from '../services/backendApi';
import { MESSAGES } from '../constants';
import Toast from 'react-native-toast-message';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to fetch from backend first
      try {
        const { accounts: backendAccounts } = await backendApi.getAccounts();

        // Map backend accounts to local format
        const mappedAccounts: Account[] = backendAccounts.map((acc) => ({
          id: acc.id,
          username: acc.username,
          followerCount: acc.follower_count || 0,
          isSource: acc.is_source,
          proxyConnected: !!acc.proxy_id,
          createdAt: acc.created_at,
        }));

        setAccounts(mappedAccounts);
      } catch (backendError) {
        // Fallback to local storage if backend is not available
        console.log('Backend not available, loading from local storage:', backendError);
        const data = await getAccounts();
        setAccounts(data);
      }
    } catch (err) {
      const message = MESSAGES.ERRORS.LOAD_FAILED;
      setError(message);
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setLoading(false);
    }
  }, []);

  const addAccount = useCallback(async (account: Account) => {
    try {
      await saveAccount(account);
      await loadAccounts();
      Toast.show({
        type: 'success',
        text1: MESSAGES.SUCCESS.ACCOUNT_ADDED,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: MESSAGES.ERRORS.SAVE_FAILED,
      });
      throw err;
    }
  }, [loadAccounts]);

  const updateAccountData = useCallback(async (id: string, updates: Partial<Account>) => {
    try {
      await updateAccount(id, updates);
      await loadAccounts();
      Toast.show({
        type: 'success',
        text1: MESSAGES.SUCCESS.ACCOUNT_UPDATED,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: MESSAGES.ERRORS.SAVE_FAILED,
      });
      throw err;
    }
  }, [loadAccounts]);

  const removeAccount = useCallback(async (id: string) => {
    try {
      await deleteAccount(id);
      await loadAccounts();
      Toast.show({
        type: 'success',
        text1: MESSAGES.SUCCESS.ACCOUNT_DELETED,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: MESSAGES.ERRORS.SAVE_FAILED,
      });
      throw err;
    }
  }, [loadAccounts]);

  const setSourceAccount = useCallback(async (id: string) => {
    try {
      await setSource(id);
      await loadAccounts();
      Toast.show({
        type: 'success',
        text1: MESSAGES.SUCCESS.SOURCE_SET,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: MESSAGES.ERRORS.SAVE_FAILED,
      });
      throw err;
    }
  }, [loadAccounts]);

  return {
    accounts,
    loading,
    error,
    loadAccounts,
    addAccount,
    updateAccount: updateAccountData,
    removeAccount,
    setSourceAccount,
  };
}
