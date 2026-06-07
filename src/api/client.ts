import axios from 'axios';
import { invoke } from '@tauri-apps/api/core';

let dynamicPort: number | null = null;

export const initApiClient = async () => {
  try {
    dynamicPort = await invoke('get_server_port');
    apiClient.defaults.baseURL = `http://127.0.0.1:${dynamicPort}`;
    console.log(`ApiClient initialized with dynamic port ${dynamicPort}`);
  } catch (err) {
    console.error("Failed to get server port from Tauri", err);
  }
};

export const getBaseUrl = () => {
  if (!dynamicPort) return 'http://127.0.0.1:5050';
  return `http://127.0.0.1:${dynamicPort}`;
};

export const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:5050',
});

// You can add interceptors here if needed in the future
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      console.log('💡 Local Mode Active: YouTube auth missing, routing action to local storage.');
    } else {
      console.error('API Error:', error);
    }
    return Promise.reject(error);
  }
);
