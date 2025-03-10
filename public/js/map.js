// Configuración inicial del mapa
const map = L.map('map', {
    maxZoom: 19  // Añadir explícitamente maxZoom
}).setView([-38.7183, -62.2661], 13); // Coordenadas de Bahía Blanca

// Añadir capa de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19  // Especificar maxZoom para el tile layer también
}).addTo(map);

// Variable para almacenar el marcador de selección de ubicación
let selectedMarker = null;
let selectedLocation = null;

// Crear un grupo de clusters para los marcadores
let markerClusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 18,  // Desactivar clustering en zoom muy cercano
    maxClusterRadius: function(zoom) {
        // Ajustar el radio de clustering según el nivel de zoom
        return zoom >= 15 ? 20 : zoom >= 13 ? 40 : 80;
    },
    iconCreateFunction: function(cluster) {
        // Personalización de los iconos de cluster
        var childCount = cluster.getChildCount();
        var hasUrgent = false;
        
        // Comprobar si hay marcadores urgentes en el cluster
        cluster.getAllChildMarkers().forEach(function(marker) {
            if (marker.options.isUrgent) {
                hasUrgent = true;
            }
        });
        
        var className = 'marker-cluster' + 
                       (hasUrgent ? ' marker-cluster-urgent' : '');
        
        // Determinar tamaño y color según cantidad de marcadores
        var size;
        var colorClass;
        
        if (childCount < 10) {
            size = 'small';
            colorClass = 'marker-cluster-small';
        } else if (childCount < 100) {
            size = 'medium';
            colorClass = 'marker-cluster-medium';
        } else {
            size = 'large';
            colorClass = 'marker-cluster-large';
        }
        
        return new L.DivIcon({
            html: '<div><span>' + childCount + '</span></div>',
            className: className + ' ' + colorClass,
            iconSize: new L.Point(40, 40)
        });
    }
});

// Añadir el grupo de cluster al mapa
map.addLayer(markerClusterGroup);

// Evento de clic en el mapa para seleccionar ubicación
map.on('click', function(e) {
    // Si ya hay un marcador, eliminarlo
    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }
    
    // Crear nuevo marcador en la ubicación seleccionada
    selectedMarker = L.marker(e.latlng).addTo(map);
    
    // Guardar la ubicación seleccionada
    selectedLocation = e.latlng;
    
    // Actualizar el texto de ubicación seleccionada
    document.getElementById('selected-location').textContent = 
        `Latitud: ${e.latlng.lat.toFixed(6)}, Longitud: ${e.latlng.lng.toFixed(6)}`;
});

// Función para cargar los incidentes desde la API
async function loadIncidents() {
    try {
        // Limpiar los marcadores existentes
        markerClusterGroup.clearLayers();
        
        const response = await fetch('/api/incidents');
        if (!response.ok) throw new Error('Error al cargar incidentes');
        
        const incidents = await response.json();
        
        // Procesar incidentes en lotes para mejorar rendimiento
        const batchSize = 100;
        for (let i = 0; i < incidents.length; i += batchSize) {
            setTimeout(() => {
                processIncidentBatch(incidents.slice(i, i + batchSize));
            }, 0);
        }
    } catch (error) {
        console.error('Error cargando incidentes:', error);
    }
}

// Procesar un lote de incidentes
function processIncidentBatch(incidents) {
    incidents.forEach(incident => {
        const marker = L.marker([incident.location.lat, incident.location.lng], {
            isUrgent: incident.urgent // Propiedad para identificar marcadores urgentes
        });
        
        marker.bindPopup(`
            <strong>${getCategoryName(incident.category, incident.subcategory)}</strong>
            <p>${incident.description}</p>
            <small>Reportado: ${new Date(incident.created).toLocaleString()}</small>
            ${incident.urgent ? '<p class="urgent-tag"><strong>¡URGENTE!</strong></p>' : ''}
        `);
        
        // Añadir al grupo de cluster en lugar de directamente al mapa
        markerClusterGroup.addLayer(marker);
    });
}

// Función para obtener el nombre legible de una categoría
function getCategoryName(category, subcategory) {
    const categories = {
        'transporte': {
            'estado_circulacion': 'Estado de Circulación',
            'impedimentos_bloqueos': 'Impedimentos y Bloqueos',
            'rutas_alternativas': 'Rutas Alternativas'
        },
        'infraestructura': {
            'vial_danada': 'Infraestructura Vial Dañada',
            'parqueos_inundados': 'Parqueos Inundados',
            'puentes_viaductos': 'Puentes y Viaductos'
        },
        'servicios_publicos': {
            'suministro_electrico': 'Suministro Eléctrico',
            'suministro_gas': 'Suministro de Gas',
            'telecomunicaciones': 'Telecomunicaciones'
        },
        'abastecimiento': {
            'agua_potable': 'Agua Potable',
            'alimentos': 'Alimentos',
            'material_higienico': 'Material Higiénico',
            'medicamentos': 'Medicamentos'
        },
        'asistencia_voluntaria': {
            'puntos_encuentro': 'Puntos de Encuentro',
            'refugios': 'Refugios'
        }
    };
    
    try {
        return categories[category][subcategory];
    } catch (e) {
        return `${category} - ${subcategory}`;
    }
}

// Cargar incidentes al iniciar
document.addEventListener('DOMContentLoaded', loadIncidents);