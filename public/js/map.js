// Configuración inicial del mapa
const map = L.map('map').setView([-38.7183, -62.2661], 13); // Coordenadas de Bahía Blanca

// Añadir capa de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Variable para almacenar el marcador de selección de ubicación
let selectedMarker = null;
let selectedLocation = null;

// Evento de clic en el mapa para seleccionar ubicación
map.on('click', function (e) {
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
async function loadIncidents(filteredCategories = []) {
    try {
        loadingIndicator.style.display = 'flex';

        // Removemos todos los marcadores existentes
        Object.values(incidentMarkers).forEach(marker => map.removeLayer(marker));
        incidentMarkers = {};

        // Obtener incidentes desde la API
        const response = await fetch('/api/incidents');
        if (!response.ok) throw new Error('Error loading incidents');
        const incidents = await response.json();

        // Filtrar los incidentes si hay categorías seleccionadas
        const filteredIncidents = filteredCategories.length > 0
            ? incidents.filter(incident => filteredCategories.includes(incident.category))
            : incidents;

        // Agregar los incidentes filtrados al mapa
        filteredIncidents.forEach(incident => addIncidentToMap(incident));
    } catch (error) {
        console.error('Error loading incidents:', error);
    } finally {
        loadingIndicator.style.display = 'none';
    }
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
