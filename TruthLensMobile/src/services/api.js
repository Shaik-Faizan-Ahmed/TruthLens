/**
 * TruthLens API Service - Expo Version
 * Handles all communication with the backend API
 */

import axios from 'axios';
import { Platform } from 'react-native';

// Backend configuration
const API_CONFIG = {
  // Different URLs for different platforms
  BASE_URL: Platform.select({
    android: 'http://10.0.2.2:8000',  // Android emulator
    ios: 'http://localhost:8000',      // iOS simulator
    default: 'http://localhost:8000'   // Default fallback
  }),
  
  // For physical devices, you'll need to use your computer's IP
  // Uncomment and update with your actual IP address:
  // BASE_URL: 'http://192.168.1.XXX:8000',
  
  TIMEOUT: 30000,  // 30 seconds timeout
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// Create axios instance
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) {
      console.log('Request data:', JSON.stringify(config.data).substring(0, 200) + '...');
    }
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
api.interceptors.response.use(
  (response) => {
    console.log(`📥 API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        message: 'Network error. Please check your internet connection and ensure the backend is running.',
        type: 'NETWORK_ERROR',
        details: error.message
      });
    }
    
    // Handle API errors
    const errorMessage = error.response.data?.detail || 
                        error.response.data?.message || 
                        'Something went wrong with the analysis';
    
    return Promise.reject({
      message: errorMessage,
      status: error.response.status,
      type: 'API_ERROR',
      details: error.response.data
    });
  }
);

/**
 * Analyze content for misinformation and scams
 * @param {Object} contentData - Content analysis request
 * @param {string} contentData.content - Text content to analyze
 * @param {string} contentData.content_type - Type of content ('text', 'url', etc.)
 * @param {string} contentData.language - Language code ('en', 'hi', etc.)
 * @param {string} contentData.source_app - Source application name
 * @returns {Promise<Object>} Analysis result
 */
export const analyzeContent = async (contentData) => {
  try {
    // Validate input
    if (!contentData || !contentData.content) {
      throw new Error('Content is required for analysis');
    }

    const trimmedContent = contentData.content.trim();
    if (trimmedContent.length < 5) {
      throw new Error('Content too short to analyze (minimum 5 characters)');
    }

    if (trimmedContent.length > 10000) {
      throw new Error('Content too long to analyze (maximum 10,000 characters)');
    }

    // Prepare request data
    const requestData = {
      content: trimmedContent,
      content_type: contentData.content_type || 'text',
      language: contentData.language || 'en',
      source_app: contentData.source_app || 'mobile',
      user_context: contentData.user_context || null
    };

    console.log('🔍 Analyzing content:', trimmedContent.substring(0, 100) + '...');

    // Make API call
    const response = await api.post('/analyze', requestData);
    
    // Log result summary
    const result = response.data;
    console.log(`✅ Analysis complete: Risk=${result.risk_level}, Confidence=${result.confidence}`);
    
    return result;

  } catch (error) {
    console.error('❌ Content analysis failed:', error);
    
    // Re-throw with user-friendly message
    if (error.type === 'NETWORK_ERROR') {
      throw new Error('Cannot connect to TruthLens servers. Please check:\n• Your internet connection\n• Backend is running (Docker container)\n• Correct IP address in settings');
    } else if (error.status === 400) {
      throw new Error('Invalid content provided for analysis. Please check the text and try again.');
    } else if (error.status === 500) {
      throw new Error('Server error occurred. The backend may be having issues. Please try again later.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to analyze content. Please try again.');
    }
  }
};

/**
 * Get health status of the backend API
 * @returns {Promise<Object>} Health status
 */
export const getHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('❌ Health check failed:', error);
    throw error;
  }
};

/**
 * Get available detection patterns
 * @returns {Promise<Object>} Detection patterns
 */
export const getDetectionPatterns = async () => {
  try {
    const response = await api.get('/patterns');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch patterns:', error);
    throw error;
  }
};

/**
 * Test backend connectivity
 * @returns {Promise<boolean>} Connection status
 */
export const testConnection = async () => {
  try {
    console.log('🔗 Testing connection to:', API_CONFIG.BASE_URL);
    const response = await api.get('/', { timeout: 10000 });
    console.log('✅ Connection test successful');
    return response.status === 200;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
};

/**
 * Update API base URL (for switching between development and production)
 * @param {string} newBaseURL - New base URL
 */
export const updateBaseURL = (newBaseURL) => {
  api.defaults.baseURL = newBaseURL;
  console.log('🔧 API base URL updated to:', newBaseURL);
};

/**
 * Get current API configuration
 * @returns {Object} Current API config
 */
export const getAPIConfig = () => {
  return {
    baseURL: api.defaults.baseURL,
    timeout: api.defaults.timeout,
    platform: Platform.OS,
  };
};

/**
 * Quick test with sample content
 * @returns {Promise<Object>} Test result
 */
export const testAPI = async () => {
  try {
    const testContent = "Congratulations! You have won 1 lakh rupees in our lucky draw. Share your OTP to claim the prize immediately.";
    
    console.log('🧪 Testing API with sample content...');
    const result = await analyzeContent({
      content: testContent,
      content_type: 'text',
      language: 'en',
      source_app: 'test'
    });
    
    console.log('✅ API test successful:', result);
    return result;
  } catch (error) {
    console.error('❌ API test failed:', error);
    throw error;
  }
};

// Export the axios instance for advanced usage
export { api };

// Export default configuration
export default {
  analyzeContent,
  getHealth,
  getDetectionPatterns,
  testConnection,
  testAPI,
  updateBaseURL,
  getAPIConfig,
};