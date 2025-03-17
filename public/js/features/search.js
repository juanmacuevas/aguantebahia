// src/features/search.js
import { getMap, placeMarkerAtLocation } from './map.js';
import { showLoadingIndicator, hideLoadingIndicator, showToast } from './notifications.js';

// Module state
let searchInput;
let searchButton;

/**
 * Set up the search bar functionality
 */
export function setupSearchBar() {
  // Get search elements
  searchInput = document.getElementById('address-search');
  searchButton = document.getElementById('search-button');
  
  if (!searchInput || !searchButton) {
    console.warn('Search elements not found');
    return;
  }
  
  // Clear any existing event listeners (if possible)
  const newSearchButton = searchButton.cloneNode(true);
  const newSearchInput = searchInput.cloneNode(true);
  
  // Replace with fresh elements
  searchButton.parentNode.replaceChild(newSearchButton, searchButton);
  searchInput.parentNode.replaceChild(newSearchInput, searchInput);
  
  // Update references
  searchButton = newSearchButton;
  searchInput = newSearchInput;
  
  // Add click event to search button
  searchButton.addEventListener('click', function() {
    searchAddress(searchInput.value);
  });
  
  // Add enter key event to search input
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      searchAddress(searchInput.value);
    }
  });
}

/**
 * Search for an address and center the map on the result
 * @param {string} address - Address to search for
 */
export async function searchAddress(address) {
  // Validate input
  if (!address || address.trim() === '') {
    showToast('Por favor ingrese una dirección para buscar', 'error');
    return;
  }
  
  // Show loading indicator
  showLoadingIndicator();
  
  try {
    // Add location context if not present
    if (!address.toLowerCase().includes('bahía blanca') && !address.toLowerCase().includes('bahia blanca')) {
      address += ', Bahía Blanca, Argentina';
    } else if (!address.toLowerCase().includes('argentina')) {
      address += ', Argentina';
    }
    
    // Use OpenStreetMap Nominatim for geocoding
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=ar`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      // Center map on result
      const map = getMap();
      map.setView([lat, lng], 17);
      
      // Place marker at location
      placeMarkerAtLocation([lat, lng]);
      
      // Update location display text with address
      const locationDisplays = document.querySelectorAll('.location-display');
      locationDisplays.forEach(display => {
        display.textContent = result.display_name;
      });
    } else {
      showToast('No se encontró la dirección. Por favor intente con otra ubicación.', 'error');
    }
  } catch (error) {
    console.error('Error searching for address:', error);
    showToast('Error al buscar la dirección. Por favor intente nuevamente.', 'error');
  } finally {
    hideLoadingIndicator();
  }
}