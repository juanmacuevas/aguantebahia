export async function onRequest(context) {
    // Get the DB binding from environment
    const { request, env } = context;

    // Handle CORS for preflight requests
    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }

    // Handle GET request - retrieve all incidents as KML
    if (request.method === "GET") {
        try {
            // Query the database for all incidents
            const incidents = await env.DB.prepare(`
                SELECT id, category, subcategory, description, urgent, 
                       json_extract(location, '$.lat') as lat, 
                       json_extract(location, '$.lng') as lng, 
                       timestamp 
                FROM incidents 
                ORDER BY timestamp DESC
            `).all();

            // Format the incidents data
            const formattedIncidents = incidents.results.map(incident => ({
                id: incident.id,
                category: incident.category,
                subcategory: incident.subcategory,
                description: incident.description,
                urgent: incident.urgent === 1,
                location: {
                    lat: parseFloat(incident.lat),
                    lng: parseFloat(incident.lng)
                },
                timestamp: incident.timestamp
            }));

            // Generate KML based on the incidents
            const kml = generateKML(formattedIncidents);

            // Create the response with proper KML headers
            const headers = {
                "Content-Type": "application/vnd.google-earth.kml+xml",
                "Access-Control-Allow-Origin": "*",
                "Content-Disposition": "attachment; filename=incidencias.kml"
            };
            
            return new Response(kml, { headers });
        } catch (error) {
            console.error("Error generating KML:", error);
            return new Response(JSON.stringify({ error: "Error generating KML" }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }
    }

    // Handle anything other than GET or OPTIONS
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Allow": "GET, OPTIONS"
        }
    });
}

/**
 * Generate KML from incidents data
 * @param {Array} incidents - Array of incident objects
 * @returns {string} - KML document as string
 */
function generateKML(incidents) {
    // Get unique category and subcategory combinations
    const categories = new Map();
    
    incidents.forEach(incident => {
        const categoryKey = incident.category;
        
        if (!categories.has(categoryKey)) {
            categories.set(categoryKey, new Map());
        }
        
        const subcategoriesMap = categories.get(categoryKey);
        const subcategoryKey = incident.subcategory;
        
        if (!subcategoriesMap.has(subcategoryKey)) {
            subcategoriesMap.set(subcategoryKey, []);
        }
        
        subcategoriesMap.get(subcategoryKey).push(incident);
    });

    // Define category and subcategory metadata
    const categoryData = {
        "incidencias": {
            "label": "Incidencias y Emergencias",
            "color": "#cc0000",
            "subcategories": {
                "zona_inundada": {
                    "label": "Zona Inundada",
                    "color": "#1e88e5",
                    "icon": "water"
                },
                "corte_servicios": {
                    "label": "Corte de Luz, Agua o Gas",
                    "color": "#ffc107",
                    "icon": "bolt"
                },
                "camino_puente_cortado": {
                    "label": "Camino o Puente Cortado",
                    "color": "#e53935",
                    "icon": "road"
                },
                "persona_atrapada": {
                    "label": "Persona Atrapada o Incomunicada",
                    "color": "#9c27b0",
                    "icon": "user-injured"
                }
            }
        },
        "servicios": {
            "label": "Servicios y Recursos Disponibles",
            "color": "#0066cc",
            "subcategories": {
                "centro_salud": {
                    "label": "Centro de Salud Operativo",
                    "color": "#4caf50",
                    "icon": "hospital"
                },
                "refugio_evac": {
                    "label": "Refugio o Centro de Evacuación",
                    "color": "#673ab7",
                    "icon": "house-user"
                },
                "punto_carga": {
                    "label": "Punto de Carga de Celular",
                    "color": "#ff9800",
                    "icon": "charging-station"
                },
                "punto_abastecimiento": {
                    "label": "Punto de Distribución de Agua/Comida",
                    "color": "#2196f3",
                    "icon": "utensils"
                },
                "comercio_abierto": {
                    "label": "Comercio/Farmacia con Insumos Básicos",
                    "color": "#4caf50",
                    "icon": "store"
                },
                "transporte_disponible": {
                    "label": "Transporte o Evacuación Disponible",
                    "color": "#607d8b",
                    "icon": "shuttle-van"
                }
            }
        }
    };

    // Start building KML document
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Incidencias y Servicios</name>
    <description>Mapa de incidencias y servicios disponibles</description>
    
    <!-- Estilos para las diferentes categorías -->
`;

    // Define styles for different categories/subcategories
    const styles = getKMLStyles(categoryData);
    kml += styles;

    // Create folders for each category and subcategory
    for (const [category, subcategories] of categories.entries()) {
        const categoryInfo = categoryData[category] || {
            label: formatCategoryName(category),
            color: "#777777"
        };
        
        kml += `    <Folder>
      <name>${categoryInfo.label}</name>
`;

        for (const [subcategory, incidentsList] of subcategories.entries()) {
            const subcategoryInfo = categoryInfo.subcategories?.[subcategory] || {
                label: formatCategoryName(subcategory),
                color: "#777777"
            };
            
            kml += `      <Folder>
        <name>${subcategoryInfo.label}</name>
`;

            // Add all incidents in this subcategory
            for (const incident of incidentsList) {
                const styleId = `${incident.category}_${incident.subcategory}`;
                const urgentSuffix = incident.urgent ? "_urgent" : "";
                
                kml += `        <Placemark>
          <name>ID: ${incident.id}</name>
          <styleUrl>#${styleId}${urgentSuffix}</styleUrl>
          <description><![CDATA[
            <div style="font-family: Arial, sans-serif; max-width: 300px;">
              <h3 style="margin-top: 0; color: #333;">${subcategoryInfo.label}</h3>
              <p style="margin-bottom: 10px;"><strong>Descripción:</strong> ${escapeXml(incident.description)}</p>
              <p style="margin-bottom: 5px;"><strong>Categoría:</strong> ${categoryInfo.label}</p>
              <p style="margin-bottom: 5px;"><strong>Urgente:</strong> ${incident.urgent ? '<span style="color: red;">Sí</span>' : 'No'}</p>
              <p style="margin-bottom: 5px;"><strong>Fecha:</strong> ${formatDate(incident.timestamp)}</p>
              <p style="margin-bottom: 5px;"><strong>Coordenadas:</strong> ${incident.location.lat.toFixed(6)}, ${incident.location.lng.toFixed(6)}</p>
            </div>
          ]]></description>
          <Point>
            <coordinates>${incident.location.lng},${incident.location.lat},0</coordinates>
          </Point>
        </Placemark>
`;
            }
            
            kml += `      </Folder>
`;
        }
        
        kml += `    </Folder>
`;
    }

    // Close the KML document
    kml += `  </Document>
</kml>`;

    return kml;
}

/**
 * Generate KML styles for different categories and subcategories
 * @param {Object} categoryData - Category and subcategory metadata
 * @returns {string} - KML styles as string
 */
function getKMLStyles(categoryData) {
    let kmlStyles = "";
    
    // Create lookup table for Google Icons that match FontAwesome icons
    const iconMap = {
        // Incidencias
        "water": "http://maps.google.com/mapfiles/kml/shapes/water.png",
        "bolt": "http://maps.google.com/mapfiles/kml/shapes/thunderstorm.png",
        "road": "http://maps.google.com/mapfiles/kml/shapes/caution.png",
        "user-injured": "http://maps.google.com/mapfiles/kml/shapes/man.png",
        
        // Servicios
        "hospital": "http://maps.google.com/mapfiles/kml/shapes/hospitals.png",
        "house-user": "http://maps.google.com/mapfiles/kml/shapes/homegardenbusiness.png",
        "charging-station": "http://maps.google.com/mapfiles/kml/shapes/electronics.png",
        "utensils": "http://maps.google.com/mapfiles/kml/shapes/dining.png",
        "store": "http://maps.google.com/mapfiles/kml/shapes/shopping.png",
        "shuttle-van": "http://maps.google.com/mapfiles/kml/shapes/bus.png",
        
        // Defaults
        "default_incidencias": "http://maps.google.com/mapfiles/kml/paddle/red-circle.png",
        "default_servicios": "http://maps.google.com/mapfiles/kml/paddle/blu-circle.png",
        "default": "http://maps.google.com/mapfiles/kml/paddle/wht-blank.png"
    };
    
    // Color conversion from hex to KML AABBGGRR format
    function hexToKmlColor(hex, alpha = 'ff') {
        // Remove the hash
        hex = hex.replace('#', '');
        
        // Parse the hex values
        const r = hex.substring(0, 2);
        const g = hex.substring(2, 4);
        const b = hex.substring(4, 6);
        
        // KML uses AABBGGRR format
        return alpha + b + g + r;
    }
    
    // Generate styles for each category and its subcategories
    Object.entries(categoryData).forEach(([category, categoryInfo]) => {
        // Get the subcategories
        const subcategories = categoryInfo.subcategories || {};
        
        Object.entries(subcategories).forEach(([subcategory, subcategoryInfo]) => {
            const styleId = `${category}_${subcategory}`;
            const iconHref = iconMap[subcategoryInfo.icon] || 
                             iconMap[`default_${category}`] || 
                             iconMap.default;
            
            const colorNormal = hexToKmlColor(subcategoryInfo.color);
            const colorUrgent = hexToKmlColor(subcategoryInfo.color, 'ff');  // Full opacity for urgent
            
            // Normal style
            kmlStyles += `    <Style id="${styleId}">
      <IconStyle>
        <color>${colorNormal}</color>
        <scale>1.0</scale>
        <Icon>
          <href>${iconHref}</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <scale>0.8</scale>
      </LabelStyle>
    </Style>
`;
            
            // Urgent style
            kmlStyles += `    <Style id="${styleId}_urgent">
      <IconStyle>
        <color>${colorUrgent}</color>
        <scale>1.2</scale>
        <Icon>
          <href>${iconHref}</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <scale>1.0</scale>
        <color>ff0000ff</color>
      </LabelStyle>
    </Style>
`;
        });
    });
    
    return kmlStyles;
}

/**
 * Format a category or subcategory string for display
 * @param {string} category - Category or subcategory string 
 * @returns {string} - Formatted string
 */
function formatCategoryName(category) {
    return category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Format a timestamp for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Formatted date string
 */
function formatDate(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return timestamp; // Return the original string if there's a parsing error
    }
}

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}