// src/config.js

// Map configuration
export const mapConfig = {
    center: [-38.7183, -62.2661], // Default center coordinates (Bahía Blanca)
    zoom: 13,                     // Default zoom level
    maxZoom: 19,                  // Maximum zoom level

    // Base map layers
    baseLayers: {
        osm: {
            name: "OpenStreetMap",
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        },
        satellite: {
            name: "Satélite (ESRI)",
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: 'Imagery &copy; ESRI'
        },
        topo: {
            name: "Topográfico",
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        },
        cartoPositron: {
            name: "Carto Positron",
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd'
        },
        cartoDarkMatter: {
            name: "Carto Dark Matter",
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd'
        }
    },

    // Cluster configuration
    cluster: {
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 18,
        maxClusterRadius: {
            highZoom: 20,  // For zoom >= 15
            mediumZoom: 40, // For zoom >= 13
            lowZoom: 80    // For zoom < 13
        }
    }
};

// API endpoints
export const apiEndpoints = {
    incidents: '/api/incidents',
    categories: '/data/categories.json'
};

// UI configuration
export const uiConfig = {
    toastDuration: 3000,  // Duration of toast messages in ms
    sidebar: {
        defaultState: 'expanded' // or 'collapsed'
    },
    bottomsheet: {
        maxHeight: 0.8,  // Maximum height of bottomsheet as percentage of window height
        dragThreshold: 50 // Drag threshold to close the bottomsheet
    }
};