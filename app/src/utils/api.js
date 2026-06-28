import axios from 'axios';

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost
    ? debuggerHost.split(':')[0]
    : (typeof window !== 'undefined' && window.location?.hostname
        ? window.location.hostname
        : (process.env.EXPO_PUBLIC_BACKEND_IP || 'localhost'));

  return `http://${localhost}:8000`;
};

const BASE_URL = getBaseUrl();
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Auth Interceptor ──────────────────────────────────────────────────────────
// Attach the stored Firebase ID token to every outgoing request.
apiClient.interceptors.request.use(
  async (config) => {
    // Skip auth header for login/signup endpoints
    const url = config.url || '';
    if (url.includes('/api/auth/')) {
      return config;
    }

    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Failed to attach auth token:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export async function fetchMetadata() {
  const response = await apiClient.get('/api/metadata');
  return response.data;
}

export async function predictAQI(data) {
  const response = await apiClient.post('/api/predict', data);
  return response.data;
}

export async function forecastAQI(days) {
  const response = await apiClient.post('/api/forecast', { forecast_days: days });
  return response.data;
}

export async function findRoutes(data) {
  const response = await apiClient.post('/api/route', {
    start_location: data.start_location,
    end_location: data.end_location || data.destination,
    search_radius_km: data.search_radius_km,
  });
  return response.data;
}

export async function getExplanation(data) {
  const response = await apiClient.post('/api/explainability', data);
  return response.data;
}

export async function chatWithBuddy(messages) {
  const response = await apiClient.post('/api/buddy', { messages });
  return response.data;
}

export default apiClient;

