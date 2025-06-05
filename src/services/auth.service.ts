import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to axios requests if available
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Handle authentication errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Consider using useNavigate for SPA navigation if this service is used in React components
      // window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

// Register a new user
export const register = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) => {
  try {
    const response = await api.post('/auth/register', userData);
    if (response.data.success) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Login a user
export const login = async (credentials: { email: string; password: string }) => {
  try {
    const response = await api.post('/auth/login', credentials);
    if (response.data.success) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Logout a user
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
};

// Get current user profile
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update user profile
export const updateProfile = async (userData: {
  firstName?: string;
  lastName?: string;
}) => {
  try {
    const response = await api.put('/auth/profile', userData);
    if (response.data.success) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

// Get authenticated user info
export const getAuthenticatedUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export default {
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  isAuthenticated,
  getAuthenticatedUser,
  api
}; 