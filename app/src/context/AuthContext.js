import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/api';

const AuthContext = createContext(null);

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app launch
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const savedUser = await AsyncStorage.getItem(USER_KEY);

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.warn('Failed to restore auth session:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveSession = async (tokenValue, userValue) => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, tokenValue);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userValue));
    } catch (e) {
      console.warn('Failed to save auth session:', e);
    }
  };

  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn('Failed to clear auth session:', e);
    }
  };

  const signup = async (email, password) => {
    const response = await apiClient.post('/api/auth/signup', { email, password });
    const { token: idToken, uid, email: userEmail } = response.data;

    const userData = { uid, email: userEmail };
    setToken(idToken);
    setUser(userData);
    await saveSession(idToken, userData);
    return userData;
  };

  const login = async (email, password) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    const { token: idToken, uid, email: userEmail } = response.data;

    const userData = { uid, email: userEmail };
    setToken(idToken);
    setUser(userData);
    await saveSession(idToken, userData);
    return userData;
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        signup,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
