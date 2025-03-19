// src/features/map.js
import { mapConfig } from '../config.js';
import { showToast } from './notifications.js';
import { voteToDeleteIncident } from './incidents.js'; 

// Module state (private to this module)
let map;
let canvasRenderer;
let selectedMarker = null;
let selectedLocation = null;
let incidentLayers = [];

// Zoom-based radius configuration
const RADIUS_CONFIG = {
  baseZoom: 13,  // Default zoom level
  minRadius: 2,  // Smallest possible radius
  maxRadius: 10, // Largest possible radius
  zoomSensitivity: 2 // How quickly radius increases with zoom
};

/**
 * Calculate dynamic point radius based on zoom level
 * @param {number} zoom - Current map zoom level
 * @returns {number} - Calculated radius
 */
function calculatePointRadius(zoom) {
  // Calculate radius difference from base zoom
  const zoomDelta = zoom - RADIUS_CONFIG.baseZoom;
  
  // Linear scaling with zoom, but starting very small
  const radius = RADIUS_CONFIG.minRadius + 
    (zoomDelta * RADIUS_CONFIG.zoomSensitivity);
  
  // Clamp radius between min and max
  return Math.max(
    RADIUS_CONFIG.minRadius, 
    Math.min(radius, RADIUS_CONFIG.maxRadius)
  );
}

/**
 * Initialize the map with canvas renderer
 * @returns {Object} - The map instance
 */
export function initMap() {
  // Create a canvas renderer for more efficient point rendering
  canvasRenderer = L.canvas({ padding: 0.5 });

  // Initialize map with configuration and canvas renderer
  map = L.map('map', {
    zoomControl: false,
    maxZoom: mapConfig.maxZoom,
    renderer: canvasRenderer
  }).setView(mapConfig.center, mapConfig.zoom);

  // Add base layers
  const baseLayers = {};
  Object.entries(mapConfig.baseLayers).forEach(([key, layerConfig]) => {
    // Create options object with proper handling of subdomains
    const tileOptions = {
      maxZoom: mapConfig.maxZoom,
      attribution: layerConfig.attribution
    };

    // Only add subdomains if they exist
    if (layerConfig.subdomains) {
      tileOptions.subdomains = layerConfig.subdomains;
    }

    const layer = L.tileLayer(layerConfig.url, tileOptions);

    // Add first layer to map by default (usually OpenStreetMap)
    if (key === 'osm') {
      layer.addTo(map);
    }

    baseLayers[layerConfig.name] = layer;
  });

  // Add map controls
  addMapControls(map, baseLayers);

  // Register map click handler
  map.on('click', handleMapClick);

  // Add zoom event listener to adjust marker sizes
  map.on('zoomend', adjustMarkerSizes);

  return map;
}

/**
 * Adjust marker sizes based on current zoom level
 */
function adjustMarkerSizes() {
  const currentZoom = map.getZoom();
  const newRadius = calculatePointRadius(currentZoom);
  
  incidentLayers.forEach(marker => {
    marker.setRadius(newRadius);
  });

  // Adjust selected marker if exists
  if (selectedMarker) {
    selectedMarker.setRadius(newRadius);
  }
}

/**
 * Add map controls (layers, zoom, refresh)
 * @param {L.Map} map - The map instance
 * @param {Object} baseLayers - Base layers for the layer control
 */
function addMapControls(map, baseLayers) {
  // Layer control (at the bottom)
  L.control.layers(baseLayers, null, { position: 'bottomleft' }).addTo(map);

  // Zoom control (in the middle)
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  // Refresh control (at the top)
  const refreshControl = L.control({ position: 'bottomleft' });
  refreshControl.onAdd = () => {
    const div = L.DomUtil.create('div', 'refresh-control');
    div.innerHTML = '<button class="refresh-btn" title="Actualizar incidentes"><i class="fas fa-sync-alt"></i></button>';

    // Prevent clicks from propagating to the map
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    // Handle button click event
    div.querySelector('.refresh-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      // Import loadIncidents from incidents.js
      const { loadIncidents } = require('./incidents.js');
      if (typeof loadIncidents === 'function') {
        loadIncidents();
        showToast('Actualizando incidentes...', 'success');
      }
    });

    return div;
  };
  refreshControl.addTo(map);
}

/**
 * Handle map click to place a marker
 * @param {L.MouseEvent} e - The mouse event
 */
function handleMapClick(e) {
  placeMarkerAtLocation([e.latlng.lat, e.latlng.lng]);
}

/**
 * Place a marker at a specific location
 * @param {Array} coords - [latitude, longitude]
 */
export function placeMarkerAtLocation(coords) {
  const [lat, lng] = coords;
  const latlng = L.latLng(lat, lng);
  const currentZoom = map.getZoom();

  if (selectedMarker) {
    map.removeLayer(selectedMarker);
  }

  // Use canvas renderer for the selected marker
  selectedMarker = L.circleMarker(latlng, {
    renderer: canvasRenderer,
    radius: calculatePointRadius(currentZoom),
    fillColor: '#3388ff',
    color: '#3388ff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.7
  }).addTo(map);

  selectedLocation = latlng;

  // Update location displays
  const locationDisplays = document.querySelectorAll('.location-display');
  locationDisplays.forEach(display => {
    display.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
    display.classList.add('selected');
  });

  // Show UI based on screen size
  if (window.innerWidth <= 768) {
    const bottomsheet = document.querySelector('.bottomsheet');
    if (bottomsheet) bottomsheet.classList.add('expanded');
  } else {
    const sidebar = document.querySelector('.sidebar');
    const toggleIcon = document.getElementById('toggle-icon');
    if (sidebar) sidebar.classList.remove('collapsed');
    if (toggleIcon) toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left');
  }
}

/**
 * Add an incident marker to the map
 * @param {Object} incident - Incident data
 * @param {Object} categoryData - Category data object
 * @returns {L.CircleMarker} - The created marker
 */
export function addIncidentMarker(incident, categoryData) {
  const { category, subcategory, description, location, urgent, timestamp, id } = incident;

  // Get category/subcategory details
  const categoryInfo = categoryData[category];
  const subcategoryInfo = categoryInfo?.subcategories[subcategory];

  // Get color and icon for the marker
  const color = getMarkerColor(category, subcategory, categoryData);
  const iconClass = getMarkerIcon(category, subcategory, categoryData);

  // Create marker at incident location using CircleMarker for canvas rendering
  const incidentLocation = L.latLng(location.lat, location.lng);
  const currentZoom = map.getZoom();
  
  const marker = L.circleMarker(incidentLocation, {
    renderer: canvasRenderer,
    radius: calculatePointRadius(currentZoom),
    fillColor: color,
    color: color,
    weight: 2,
    opacity: 1,
    fillOpacity: 0.7,
    isUrgent: urgent
  });

  // Create popup content
  const categoryLabel = categoryInfo ? categoryInfo.label : 'Desconocido';
  const subcategoryLabel = categoryInfo && subcategoryInfo ?
    (typeof subcategoryInfo === 'object' ? subcategoryInfo.label : subcategoryInfo) :
    'Desconocido';

  const popupContent = `
    <div class="incident-popup">
      <h3>${subcategoryLabel}</h3>
      <p>${description}</p>
      <p><small>Reportado: ${new Date(timestamp).toLocaleString()}</small></p>
      ${urgent ? '<p class="urgent-tag"><strong>¡URGENTE!</strong></p>' : ''}
      <button class="report-incident-btn" data-incident-id="${id}">
        <i class="fas fa-flag"></i> Marcar como resuelto o inexacto
      </button>
    </div>
  `;

  const popup = L.popup().setContent(popupContent);
  marker.bindPopup(popup);

  // Add event listener when popup opens
  marker.on('popupopen', function () {
    // Fixed event listener with proper scope
    setTimeout(() => {
      const reportButton = document.querySelector(`.report-incident-btn[data-incident-id="${id}"]`);
      if (reportButton) {
        reportButton.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          // Directly call the imported function
          voteToDeleteIncident(id);
        });
      }
    }, 100); // Short timeout to ensure the DOM is ready
  });

  // Add marker to the map and track it
  marker.addTo(map);
  incidentLayers.push(marker);

  return marker;
}

/**
 * Clear all incident markers from the map
 */
export function clearIncidentMarkers() {
  incidentLayers.forEach(layer => map.removeLayer(layer));
  incidentLayers = [];
}

/**
 * Clear the selected marker
 */
export function clearSelectedMarker() {
  if (selectedMarker) {
    map.removeLayer(selectedMarker);
    selectedMarker = null;
    selectedLocation = null;

    const locationDisplays = document.querySelectorAll('.location-display');
    locationDisplays.forEach(display => {
      display.textContent = 'Haga clic en el mapa para seleccionar una ubicación';
      display.classList.remove('selected');
    });
  }
}

/**
 * Get marker color based on category and subcategory
 * @param {string} catKey - Category key
 * @param {string} subKey - Subcategory key
 * @param {Object} categoryData - Category data object
 * @returns {string} - Color code
 */
function getMarkerColor(catKey, subKey, categoryData) {
  const cat = categoryData[catKey];
  if (!cat) return '#999999';
  const sub = cat.subcategories[subKey];
  return typeof sub === 'object' && sub.color ? sub.color : cat.color;
}

/**
 * Get marker icon based on category and subcategory
 * @param {string} catKey - Category key
 * @param {string} subKey - Subcategory key
 * @param {Object} categoryData - Category data object
 * @returns {string} - Icon CSS class
 */
function getMarkerIcon(catKey, subKey, categoryData) {
  const cat = categoryData[catKey];
  if (!cat) return 'fa-solid fa-map-marker-alt';
  const sub = cat.subcategories[subKey];
  if (typeof sub === 'object' && sub.icon) return sub.icon;
  return cat.icon || 'fa-solid fa-map-marker-alt';
}

/**
 * Get the map instance (for use by other modules)
 * @returns {L.Map} - The map instance
 */
export function getMap() {
  return map;
}

/**
 * Get the selected location
 * @returns {L.LatLng|null} - The selected location
 */
export function getSelectedLocation() {
  return selectedLocation;
}