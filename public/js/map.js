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
        const response = await fetch('/api/incidents');
        if (!response.ok) throw new Error('Error al cargar incidentes');
        
        const incidents = await response.json();
        
        incidents.forEach(incident => {
            const marker = L.marker([incident.location.lat, incident.location.lng]).addTo(map);
            
            marker.bindPopup(`
                <strong>${getCategoryName(incident.category, incident.subcategory)}</strong>
                <p>${incident.description}</p>
                <small>Reportado: ${new Date(incident.created).toLocaleString()}</small>
            `);
        });
    } catch (error) {
        console.error('Error cargando incidentes:', error);
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
