// src/features/map.js
import { mapConfig } from '../config.js';
import { showToast } from './notifications.js';

// Module state (private to this module)
let map;
let markerClusterGroup;
let selectedMarker = null;
let selectedLocation = null;

/**
 * Initialize the map
 * @returns {Object} - The map instance
 */
export function initMap() {
  // Initialize map with configuration
  map = L.map('map', {
    zoomControl: false,
    maxZoom: mapConfig.maxZoom
  }).setView(mapConfig.center, mapConfig.zoom);


  // Initialize the marker cluster group
  markerClusterGroup = createMarkerClusterGroup();
  map.addLayer(markerClusterGroup);


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

  return map;
}

/**
 * Create the marker cluster group with custom settings
 * @returns {L.MarkerClusterGroup} - The created marker cluster group
 */
function createMarkerClusterGroup() {
  return L.markerClusterGroup({
    chunkedLoading: true,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: mapConfig.cluster.disableClusteringAtZoom,
    maxClusterRadius: function (zoom) {
      if (zoom >= 15) return mapConfig.cluster.maxClusterRadius.highZoom;
      if (zoom >= 13) return mapConfig.cluster.maxClusterRadius.mediumZoom;
      return mapConfig.cluster.maxClusterRadius.lowZoom;
    },
    iconCreateFunction: function (cluster) {
      const childCount = cluster.getChildCount();
      let hasUrgent = false;

      // Check if any markers in the cluster are urgent
      cluster.getAllChildMarkers().forEach(function (marker) {
        if (marker.options.isUrgent) {
          hasUrgent = true;
        }
      });

      const className = 'marker-cluster' +
        (hasUrgent ? ' marker-cluster-urgent' : '');

      let colorClass;
      if (childCount < 10) {
        colorClass = 'marker-cluster-small';
      } else if (childCount < 100) {
        colorClass = 'marker-cluster-medium';
      } else {
        colorClass = 'marker-cluster-large';
      }

      return new L.DivIcon({
        html: '<div><span>' + childCount + '</span></div>',
        className: className + ' ' + colorClass,
        iconSize: new L.Point(40, 40)
      });
    }
  });
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
      // We'll implement this in incidents.js and import it here
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

  if (selectedMarker) {
    map.removeLayer(selectedMarker);
  }

  selectedMarker = L.marker(latlng).addTo(map);
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
 * @returns {L.Marker} - The created marker
 */
export function addIncidentMarker(incident, categoryData) {
  const { category, subcategory, description, location, urgent, timestamp, id } = incident;

  // Get category/subcategory details
  const categoryInfo = categoryData[category];
  const subcategoryInfo = categoryInfo?.subcategories[subcategory];

  // Get color and icon for the marker
  const color = getMarkerColor(category, subcategory, categoryData);
  const iconClass = getMarkerIcon(category, subcategory, categoryData);

  // Create marker at incident location
  const incidentLocation = L.latLng(location.lat, location.lng);
  const iconHtml = `<i class="${iconClass}" style="color: ${color}; border: 2px solid ${color};"></i>`;
  const customIcon = L.divIcon({
    html: iconHtml,
    className: urgent ? 'custom-marker-icon urgent' : 'custom-marker-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  const marker = L.marker(incidentLocation, {
    icon: customIcon,
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
    const reportButton = document.querySelector(`.report-incident-btn[data-incident-id="${id}"]`);
    if (reportButton) {
      reportButton.addEventListener('click', function () {
        // This will be implemented in incidents.js
        if (typeof voteToDeleteIncident === 'function') {
          voteToDeleteIncident(id);
        }
      });
    }
  });

  return marker;
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
 * Get the marker cluster group (for use by other modules)
 * @returns {L.MarkerClusterGroup} - The marker cluster group
 */
export function getMarkerClusterGroup() {
  return markerClusterGroup;
}

/**
 * Get the selected location
 * @returns {L.LatLng|null} - The selected location
 */
export function getSelectedLocation() {
  return selectedLocation;
}