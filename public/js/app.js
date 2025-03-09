// Variables globales
let map;
let categoriesData = {};
let incidentMarkers = {};
let selectedMarker = null;
let selectedLocation = null;

// Elementos DOM
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.querySelector('.sidebar-toggle');
const toggleIcon = document.getElementById('toggle-icon');
const bottomsheet = document.querySelector('.bottomsheet');
const bottomsheetHandle = document.querySelector('.bottomsheet-handle');
const locationDisplays = document.querySelectorAll('.location-display');
const categorySelects = document.querySelectorAll('.category-select');
const incidentForms = document.querySelectorAll('.incident-form');
const urgentCheckboxes = document.querySelectorAll('.urgent-checkbox');
const descriptionInputs = document.querySelectorAll('.description-input');
const loadingIndicator = document.querySelector('.loading');


// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Verificar que jQuery esté cargado
    if (typeof jQuery === 'undefined') {
        console.error('jQuery is required for this application.');
        return;
    }

    initMap();
    initUI();
    loadCategories();
}


// Inicializar el mapa
// En public/js/app.js, modifica la función initMap:

function initMap() {
    // Crear mapa centrado en Bahía Blanca
    const map = L.map('map').setView([-38.7183, -62.2661], 13);

    // Capas base - todas gratuitas
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Imagery &copy; ESRI',
    });

    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
    });

    // Capas adicionales gratuitas
    const cartoPositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    });

    const cartoDarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    });

    // Agregar una capa base predeterminada
    osmLayer.addTo(map);

    // Control de capas
    const baseMaps = {
        "OpenStreetMap": osmLayer,
        "Satélite (ESRI)": satelliteLayer,
        "Topográfico": topoLayer,
        "Carto Positron": cartoPositron,
        "Carto Dark Matter": cartoDarkMatter
    };

    // Agregar control de capas al mapa
    L.control.layers(baseMaps).addTo(map);


    // Añadir botón de actualización
    const refreshControl = L.control({ position: 'topright' });
    refreshControl.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'refresh-control');
        div.innerHTML = '<button class="refresh-btn" title="Actualizar incidentes"><i class="fas fa-sync-alt"></i></button>';
        div.style.backgroundColor = 'white';
        div.style.padding = '5px';
        div.style.borderRadius = '4px';
        div.style.cursor = 'pointer';
        div.onclick = function () {
            loadIncidents();
        };
        return div;
    };
    refreshControl.addTo(map);

    // Manejar clics en el mapa para colocar marcadores
    map.on('click', handleMapClick);
}

// Cargar categorías desde el archivo JSON
async function loadCategories() {
    try {
        const response = await fetch('/data/categories.json');
        if (!response.ok) {
            throw new Error('Error loading categories');
        }

        categoriesData = await response.json();

        // Rellenar selects de categorías
        populateCategorySelects();

        // Cargar incidentes después de cargar categorías
        loadIncidents();

        // Ocultar indicador de carga
        loadingIndicator.style.display = 'none';

    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Error loading categories. Please refresh the page.');
    }
}

// Rellenar los selectores de categorías
function populateCategorySelects() {
    categorySelects.forEach(select => {
        // Limpiar opciones existentes
        select.innerHTML = '';

        // Añadir opción predeterminada
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Seleccionar...';
        select.appendChild(defaultOption);

        // Añadir categorías y subcategorías
        for (const [categoryKey, categoryData] of Object.entries(categoriesData)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = categoryData.label;

            for (const [subcategoryKey, subcategoryData] of Object.entries(categoryData.subcategories)) {
                const option = document.createElement('option');
                option.value = `${categoryKey}.${subcategoryKey}`;

                // Extraer datos necesarios
                const subcategoryLabel = typeof subcategoryData === 'object' ? subcategoryData.label : subcategoryData;
                option.textContent = subcategoryLabel;

                // Guardar datos para Select2
                option.dataset.icon = getSubcategoryIcon(categoryKey, subcategoryKey);
                option.dataset.color = getSubcategoryColor(categoryKey, subcategoryKey);

                optgroup.appendChild(option);
            }

            select.appendChild(optgroup);
        }

        // Inicializar Select2
        $(select).select2({
            placeholder: "Seleccionar tipo de incidente...",
            allowClear: true,
            templateResult: formatCategoryOption,
            templateSelection: formatCategoryOption
        });
    });

    // Asegurarse de que la sincronización funcione con Select2
    $('.category-select').on('select2:select', function (e) {
        const selectedValue = this.value;
        categorySelects.forEach(otherSelect => {
            if (otherSelect !== this) {
                $(otherSelect).val(selectedValue).trigger('change');
            }
        });
    });
}

// Función para formatear opciones de Select2
function formatCategoryOption(option) {
    if (!option.id) {
        return option.text;
    }

    const icon = option.element.dataset.icon;
    const color = option.element.dataset.color;

    if (!icon || !color) {
        return option.text;
    }

    return $(`
        <span>
            <span class="category-icon">
                <i class="${icon}" style="color: ${color}; border-color: ${color};"></i>
            </span>
            <span>${option.text}</span>
        </span>
    `);
}

// Función auxiliar para obtener el color de una subcategoría
function getSubcategoryColor(categoryKey, subcategoryKey) {
    const category = categoriesData[categoryKey];
    if (!category) return '#999999';

    const subcategory = category.subcategories[subcategoryKey];

    // Si la subcategoría es un objeto y tiene color, usar ese
    if (typeof subcategory === 'object' && subcategory.color) {
        return subcategory.color;
    }

    // Si no, usar el color de la categoría padre
    return category.color;
}

// Función auxiliar para obtener el ícono de una subcategoría
function getSubcategoryIcon(categoryKey, subcategoryKey) {
    const category = categoriesData[categoryKey];
    if (!category) return 'fa-solid fa-map-marker-alt';

    const subcategory = category.subcategories[subcategoryKey];

    // Si la subcategoría es un objeto y tiene ícono, usar ese
    if (typeof subcategory === 'object' && subcategory.icon) {
        return subcategory.icon;
    }

    // Si no, usar el ícono de la categoría padre si existe
    if (category.icon) {
        return category.icon;
    }

    // Valor por defecto
    return 'fa-solid fa-map-marker-alt';
}

// Cargar incidentes desde la API
async function loadIncidents() {
    try {
        loadingIndicator.style.display = 'flex';

        // Limpiar marcadores de incidentes existentes
        for (const id in incidentMarkers) {
            map.removeLayer(incidentMarkers[id]);
        }
        incidentMarkers = {};

        const response = await fetch('/api/incidents');
        if (!response.ok) {
            throw new Error('Error loading incidents');
        }

        const incidents = await response.json();

        // Añadir incidentes al mapa
        incidents.forEach(incident => {
            addIncidentToMap(incident);
        });

    } catch (error) {
        console.error('Error loading incidents:', error);
        // No mostrar alerta aquí para evitar molestar a los usuarios si la API no está lista
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// Inicializar la interfaz de usuario
function initUI() {
    // Configurar toggle del sidebar
    sidebarToggle.addEventListener('click', toggleSidebar);

    // Configurar dragado del bottomsheet
    setupBottomsheetDrag();

    const closeBottomsheetBtn = document.getElementById('close-bottomsheet');
    if (closeBottomsheetBtn) {
        closeBottomsheetBtn.addEventListener('click', function () {
            bottomsheet.classList.remove('expanded');
        });
    }


    // Inicializar modal informativo
    initInfoModal();

    // Configurar sincronización de formularios
    setupFormSync();

    // Configurar eventos de envío de formulario
    setupFormSubmission();

    // Configurar recarga periódica de incidentes
    setInterval(loadIncidents, 60000); // Cada 60 segundos

    // Manejar cambios de tamaño de ventana
    window.addEventListener('resize', handleWindowResize);
}


// Inicialización del modal informativo

function initInfoModal() {
    const infoButton = document.getElementById('infoButton');
    const infoModal = document.getElementById('infoModal');
    const closeModal = document.querySelector('.close-modal');

    // Abrir modal al hacer clic en el botón de información
    infoButton.addEventListener('click', function () {
        infoModal.style.display = 'block';
    });

    // Cerrar modal al hacer clic en la X
    closeModal.addEventListener('click', function () {
        infoModal.style.display = 'none';
    });

    // Cerrar modal al hacer clic fuera del contenido
    window.addEventListener('click', function (event) {
        if (event.target === infoModal) {
            infoModal.style.display = 'none';
        }
    });

    setupCopyLink();

    // Cerrar modal al presionar ESC
    window.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && infoModal.style.display === 'block') {
            infoModal.style.display = 'none';
        }
    });


}



function setupCopyLink() {
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', function () {
            // Texto a copiar (incluye el protocolo para asegurar que es una URL válida)
            const linkToCopy = window.location.origin || 'https://aguantebahia.com';

            // Intenta copiar usando el API moderno
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(linkToCopy)
                    .then(() => showCopiedConfirmation(copyLinkBtn))
                    .catch(() => fallbackCopyMethod(linkToCopy, copyLinkBtn));
            } else {
                // Método alternativo para navegadores que no soportan clipboard API
                fallbackCopyMethod(linkToCopy, copyLinkBtn);
            }
        });
    }
}

// Método alternativo para copiar en navegadores más antiguos
function fallbackCopyMethod(text, button) {
    // Crear un elemento temporal
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; // Evita desplazamiento
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        // Ejecuta el comando de copia
        const successful = document.execCommand('copy');
        if (successful) {
            showCopiedConfirmation(button);
        } else {
            button.innerHTML = '<i class="fas fa-times"></i> Error al copiar';
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-link"></i> Copiar enlace';
            }, 2000);
        }
    } catch (err) {
        console.error('Error al copiar: ', err);
        alert('No se pudo copiar el enlace. El enlace es: ' + text);
    }

    // Limpia
    document.body.removeChild(textArea);
}

// Muestra confirmación de copia
function showCopiedConfirmation(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Enlace copiado';
    button.classList.add('copied');

    setTimeout(function () {
        button.innerHTML = originalText;
        button.classList.remove('copied');
    }, 2000);
}


// Alternar estado del sidebar
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    if (sidebar.classList.contains('collapsed')) {
        toggleIcon.classList.remove('fa-chevron-left');
        toggleIcon.classList.add('fa-chevron-right');
    } else {
        toggleIcon.classList.remove('fa-chevron-right');
        toggleIcon.classList.add('fa-chevron-left');
    }
}

// Configurar arrastre del bottomsheet

function setupBottomsheetDrag() {
    let startY, startHeight, isDragging = false;
    const bottomsheetHandle = document.querySelector('.bottomsheet-handle');

    if (!bottomsheetHandle) return;

    bottomsheetHandle.addEventListener('mousedown', dragStart);
    bottomsheetHandle.addEventListener('touchstart', dragStart);

    window.addEventListener('mousemove', drag);
    window.addEventListener('touchmove', drag);

    window.addEventListener('mouseup', dragEnd);
    window.addEventListener('touchend', dragEnd);

    // Permitir que el handle también expanda el bottomsheet con un click
    bottomsheetHandle.addEventListener('click', () => {
        // Si ya está expandido, no hacemos nada (dejar que el botón X lo cierre)
        if (!bottomsheet.classList.contains('expanded')) {
            bottomsheet.classList.add('expanded');
        }
    });

    function dragStart(e) {
        e.preventDefault();
        isDragging = true;
        startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        startHeight = parseInt(document.defaultView.getComputedStyle(bottomsheet).height, 10);
    }

    function drag(e) {
        if (!isDragging) return;
        const y = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const deltaY = y - startY;

        if (deltaY < 0) { // Moviendo hacia arriba (expandiendo)
            const newHeight = Math.min(startHeight - deltaY, window.innerHeight * 0.8);
            bottomsheet.style.height = `${newHeight}px`;
            bottomsheet.classList.add('expanded');
        } else if (deltaY > 50) { // Moviendo hacia abajo (colapsando)
            bottomsheet.classList.remove('expanded');
            bottomsheet.removeAttribute('style');
        }
    }

    function dragEnd() {
        isDragging = false;
    }
}

// Configurar sincronización entre formularios
function setupFormSync() {
    // Sincronizar categorías
    categorySelects.forEach(select => {
        select.addEventListener('change', function () {
            const selectedValue = this.value;
            categorySelects.forEach(otherSelect => {
                if (otherSelect !== this) {
                    otherSelect.value = selectedValue;
                }
            });
        });
    });

    // Sincronizar checkboxes de urgencia
    urgentCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const isChecked = this.checked;
            urgentCheckboxes.forEach(otherCheckbox => {
                if (otherCheckbox !== this) {
                    otherCheckbox.checked = isChecked;
                }
            });
        });
    });

    // Sincronizar inputs de descripción
    descriptionInputs.forEach(input => {
        input.addEventListener('input', function () {
            const text = this.value;
            descriptionInputs.forEach(otherInput => {
                if (otherInput !== this) {
                    otherInput.value = text;
                }
            });
        });
    });
}

// Configurar envío de formularios
function setupFormSubmission() {
    incidentForms.forEach(form => {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Validación del formulario
            if (!selectedMarker) {
                showToast('Por favor, seleccione una ubicación en el mapa.', 'error');
                return;
            }

            const categorySelect = this.querySelector('.category-select');
            const descriptionInput = this.querySelector('.description-input');
            const urgentCheckbox = this.querySelector('.urgent-checkbox');

            // Validar que se haya seleccionado una categoría
            if (!categorySelect.value) {
                showToast('Por favor, seleccione un tipo de incidente.', 'error');
                return;
            }

            // Obtener categoría y subcategoría del valor combinado
            const [category, subcategory] = categorySelect.value.split('.');

            // Preparar datos para enviar
            const formData = {
                category: category,
                subcategory: subcategory,
                description: descriptionInput.value,
                urgent: urgentCheckbox.checked,
                location: {
                    lat: selectedLocation.lat,
                    lng: selectedLocation.lng
                }
            };

            try {
                // Mostrar indicador de carga
                loadingIndicator.style.display = 'flex';

                // Enviar datos a la API
                const response = await fetch('/api/incidents', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                // Procesar respuesta
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Error al enviar el reporte.');
                }

                // Éxito - mostrar toast en lugar de alert
                showToast('Reporte enviado con éxito!', 'success');

                // Reiniciar todos los formularios
                incidentForms.forEach(form => {
                    form.reset();
                });

                // Reiniciar ubicación y marcador
                if (selectedMarker) {
                    map.removeLayer(selectedMarker);
                    selectedMarker = null;
                    selectedLocation = null;
                }

                // Reiniciar textos de ubicación
                locationDisplays.forEach(display => {
                    display.textContent = 'Haga clic en el mapa para seleccionar una ubicación';
                });

                // Cerrar formularios
                sidebar.classList.add('collapsed');
                toggleIcon.classList.remove('fa-chevron-left');
                toggleIcon.classList.add('fa-chevron-right');
                bottomsheet.classList.remove('expanded');

                // Recargar los incidentes en el mapa
                loadIncidents();

            } catch (error) {
                console.error('Error:', error);
                // Error - mostrar toast en lugar de alert
                showToast('Error al enviar el reporte: ' + error.message, 'error');
            } finally {
                // Ocultar indicador de carga
                loadingIndicator.style.display = 'none';
            }
        });
    });
}

// Manejar clics en el mapa
function handleMapClick(e) {
    // Eliminar marcador existente si hay alguno
    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }

    // Crear nuevo marcador
    selectedMarker = L.marker(e.latlng).addTo(map);
    selectedLocation = e.latlng;

    // Actualizar texto de ubicación en todas las pantallas
    locationDisplays.forEach(display => {
        display.textContent = `Lat: ${e.latlng.lat.toFixed(6)}, Lng: ${e.latlng.lng.toFixed(6)}`;
    });

    // Abrir formulario apropiado según tamaño de pantalla
    if (window.innerWidth <= 768) {
        bottomsheet.classList.add('expanded');
    } else {
        sidebar.classList.remove('collapsed');
        toggleIcon.classList.remove('fa-chevron-right');
        toggleIcon.classList.add('fa-chevron-left');
    }
}

// Manejar cambios de tamaño de ventana
function handleWindowResize() {
    if (window.innerWidth > 768) {
        bottomsheet.classList.remove('expanded');
    }
}



function showToast(message, type = 'success', duration = 3000) {
    // Buscar un toast existente
    let toast = document.querySelector('.toast');

    // Si no existe, crearlo
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    // Configurar el toast
    toast.textContent = message;
    toast.className = 'toast';

    if (type === 'error') {
        toast.classList.add('error');
    }

    // Mostrar el toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Ocultar el toast después de un tiempo
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

function addIncidentToMap(incident) {
    // Obtener información de categoría y subcategoría
    const category = categoriesData[incident.category];
    const subcategory = category?.subcategories[incident.subcategory];

    // Determinar el color del marcador basado en la subcategoría o categoría
    const color = getSubcategoryColor(incident.category, incident.subcategory);

    // Obtener ícono
    const iconClass = getSubcategoryIcon(incident.category, incident.subcategory);

    // Crear ubicación del incidente
    const incidentLocation = L.latLng(incident.location.lat, incident.location.lng);

    // Crear un div para el ícono personalizado
    const iconHtml = `<i class="${iconClass}" style="color: ${color}; border: 2px solid ${color};"></i>`;

    // Opciones para el icono
    const customIcon = L.divIcon({
        html: iconHtml,
        className: incident.urgent ? 'custom-marker-icon urgent' : 'custom-marker-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    // Crear el marcador
    const marker = L.marker(incidentLocation, { icon: customIcon }).addTo(map);

    // Obtener etiquetas de categoría y subcategoría
    let categoryLabel = 'Desconocido';
    let subcategoryLabel = 'Desconocido';

    if (category) {
        categoryLabel = category.label;
        if (subcategory) {
            subcategoryLabel = typeof subcategory === 'object' ? subcategory.label : subcategory;
        }
    }

    // Crear contenido del popup
    const popupContent = `
        <div class="incident-popup">
            <h3>${subcategoryLabel}</h3>
            <p>${incident.description}</p>
            <p><small>Reportado: ${new Date(incident.timestamp).toLocaleString()}</small></p>
            ${incident.urgent ? '<p class="urgent-tag"><strong>¡URGENTE!</strong></p>' : ''}
        </div>
    `;

    marker.bindPopup(popupContent);

    // Almacenar referencia del marcador
    incidentMarkers[incident.id] = marker;
}