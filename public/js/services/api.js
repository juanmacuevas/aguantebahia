// src/services/api.js
import { apiEndpoints } from '../config.js';
import { showLoadingIndicator, hideLoadingIndicator } from '../features/notifications.js';

/**
 * API Service for handling all API requests
 */
export const apiService = {
  /**
   * Performs a GET request to the specified endpoint
   * @param {string} endpoint - The API endpoint to call
   * @returns {Promise<Object>} - The JSON response
   */
  async get(endpoint) {
    try {
      showLoadingIndicator();
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API GET Error (${endpoint}):`, error);
      throw error;
    } finally {
      hideLoadingIndicator();
    }
  },
  
  /**
   * Performs a POST request to the specified endpoint
   * @param {string} endpoint - The API endpoint to call
   * @param {Object} data - The data to send in the request body
   * @returns {Promise<Object>} - The JSON response
   */
  async post(endpoint, data) {
    try {
      showLoadingIndicator();
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API POST Error (${endpoint}):`, error);
      throw error;
    } finally {
      hideLoadingIndicator();
    }
  },
  
  /**
   * Loads incident data from the API
   * @returns {Promise<Array>} - Array of incident objects
   */
  async getIncidents() {
    return this.get(apiEndpoints.incidents);
  },
  
  /**
   * Creates a new incident
   * @param {Object} incidentData - The incident data to submit
   * @returns {Promise<Object>} - The created incident
   */
  async createIncident(incidentData) {
    return this.post(apiEndpoints.incidents, incidentData);
  },
  
  /**
   * Votes to delete an incident
   * @param {string} incidentId - The ID of the incident to vote for deletion
   * @returns {Promise<Object>} - The response data
   */
  async voteToDeleteIncident(incidentId) {
    return this.post(apiEndpoints.incidents, {
      action: 'vote_delete',
      incidentId
    });
  },
  
  /**
   * Loads category data from the API
   * @returns {Promise<Object>} - Category data
   */
  async getCategories() {
    return this.get(apiEndpoints.categories);
  }
};