// src/features/incidents.js
import { apiService } from '../services/api.js';
import { getMap, addIncidentMarker } from './map.js';
import { getCategoriesData } from './categories.js';
import { showToast } from './notifications.js';

// Module state
let incidentMarkers = {};

/**
 * Initialize the incidents module
 * @returns {Promise<void>}
 */
export async function initIncidents() {
  try {
    await loadIncidents();
    return true;
  } catch (error) {
    console.error('Error initializing incidents:', error);
    return false;
  }
}

/**
 * Load all incidents from the API
 * @returns {Promise<Array>} - Array of incidents
 */
export async function loadIncidents() {
  try {
    // Clear existing incidents
    const map = getMap();
    Object.values(incidentMarkers).forEach(marker => map.removeLayer(marker));
    incidentMarkers = {};
    
    // Get incidents from API
    const incidents = await apiService.getIncidents();
    const categoriesData = getCategoriesData();
    
    // Process incidents in batches for better performance
    const batchSize = 100;
    for (let i = 0; i < incidents.length; i += batchSize) {
      const batch = incidents.slice(i, i + batchSize);
      setTimeout(() => {
        processBatch(batch, categoriesData);
      }, 0);
    }
    
    return incidents;
  } catch (error) {
    console.error('Error loading incidents:', error);
    showToast('Error al cargar incidentes. Inténtalo más tarde.', 'error');
    throw error;
  }
}

/**
 * Process a batch of incidents
 * @param {Array} incidents - Array of incident objects
 * @param {Object} categoriesData - Categories data
 */
function processBatch(incidents, categoriesData) {
  incidents.forEach(incident => {
    const marker = addIncidentMarker(incident, categoriesData);
    incidentMarkers[incident.id] = marker;
  });
}

/**
 * Submit a new incident
 * @param {Object} formData - Incident form data
 * @returns {Promise<Object>} - Created incident
 */
export async function submitIncident(formData) {
  try {
    // Submit incident to the API
    const result = await apiService.createIncident(formData);
    
    // Show success message
    showToast('Reporte enviado con éxito!', 'success');
    
    // Refresh incidents on the map
    await loadIncidents();
    
    return result;
  } catch (error) {
    console.error('Error submitting incident:', error);
    showToast('Error al enviar el reporte: ' + error.message, 'error');
    throw error;
  }
}

/**
 * Vote to delete an incident
 * @param {string} incidentId - ID of the incident to vote for deletion
 * @returns {Promise<Object>} - Result of the vote
 */
export async function voteToDeleteIncident(incidentId) {
  try {
    // Submit vote to the API
    const result = await apiService.voteToDeleteIncident(incidentId);
    
    // Close any open popup
    getMap().closePopup();
    
    // Show success message
    showToast('Gracias por tu aporte. Hemos registrado tu información.', 'success');
    
    // Refresh incidents on the map
    await loadIncidents();
    
    return result;
  } catch (error) {
    console.error('Error voting to delete incident:', error);
    showToast('No se pudo procesar tu aporte. Inténtalo más tarde.', 'error');
    throw error;
  }
}

/**
 * Get incident markers
 * @returns {Object} - Object with incident markers indexed by ID
 */
export function getIncidentMarkers() {
  return incidentMarkers;
}