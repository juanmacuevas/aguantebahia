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
const locationDisplays = document.querySelectorAll('.location-display');
const categorySelects = document.querySelectorAll('.category-select');
const incidentForms = document.querySelectorAll('.incident-form');
const urgentCheckboxes = document.querySelectorAll('.urgent-checkbox');
const descriptionInputs = document.querySelectorAll('.description-input');
const loadingIndicator = document.querySelector('.loading');
const bottomsheetHandle = document.querySelector('.bottomsheet-handle');

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  if (typeof jQuery === 'undefined') {
    console.error('jQuery is required for this application.');
    return;
  }
  initMap();
  initUI();
  loadCategories();
}

// Inicializar el mapa (se asigna a la variable global)
function initMap() {
  map = L.map('map').setView([-38.7183, -62.2661], 13);

  // Capas base gratuitas
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Imagery &copy; ESRI'
  });
  const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  });
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

  osmLayer.addTo(map);
  const baseMaps = {
    "OpenStreetMap": osmLayer,
    "Satélite (ESRI)": satelliteLayer,
    "Topográfico": topoLayer,
    "Carto Positron": cartoPositron,
    "Carto Dark Matter": cartoDarkMatter
  };
  L.control.layers(baseMaps, null, { position: 'bottomleft' }).addTo(map);

  // Botón para actualizar incidentes
  const refreshControl = L.control({ position: 'topright' });
  refreshControl.onAdd = () => {
    const div = L.DomUtil.create('div', 'refresh-control');
    div.innerHTML = '<button class="refresh-btn" title="Actualizar incidentes"><i class="fas fa-sync-alt"></i></button>';
    Object.assign(div.style, {
      backgroundColor: 'white',
      padding: '5px',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    div.onclick = () => loadIncidents();
    return div;
  };
  refreshControl.addTo(map);

  map.on('click', handleMapClick);
}

// Cargar categorías desde JSON
async function loadCategories() {
  try {
    const response = await fetch('/data/categories.json');
    if (!response.ok) throw new Error('Error loading categories');
    categoriesData = await response.json();
    populateCategorySelects();
    loadIncidents();
    loadingIndicator.style.display = 'none';
  } catch (error) {
    console.error('Error loading categories:', error);
    alert('Error loading categories. Please refresh the page.');
  }
}

// Rellenar los selects de categorías
function populateCategorySelects() {
  categorySelects.forEach(select => {
    select.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Seleccionar...';
    select.appendChild(defaultOption);

    for (const [catKey, catData] of Object.entries(categoriesData)) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = catData.label;
      for (const [subKey, subData] of Object.entries(catData.subcategories)) {
        const option = document.createElement('option');
        option.value = `${catKey}.${subKey}`;
        const subLabel = typeof subData === 'object' ? subData.label : subData;
        option.textContent = subLabel;
        option.dataset.icon = getSubcategoryIcon(catKey, subKey);
        option.dataset.color = getSubcategoryColor(catKey, subKey);
        optgroup.appendChild(option);
      }
      select.appendChild(optgroup);
    }

    // Inicializar Select2 y sincronizar selección entre formularios
    $(select).select2({
      placeholder: "Seleccionar tipo de incidente...",
      allowClear: true,
      templateResult: formatCategoryOption,
      templateSelection: formatCategoryOption
    }).on('select2:select', function () {
      categorySelects.forEach(otherSelect => {
        if (otherSelect !== this) {
          $(otherSelect).val(this.value).trigger('change');
        }
      });
    });
  });
}

function formatCategoryOption(option) {
  if (!option.id) return option.text;
  const { icon, color } = option.element.dataset;
  if (!icon || !color) return option.text;
  return $(`
    <span>
      <span class="category-icon">
        <i class="${icon}" style="color: ${color}; border-color: ${color};"></i>
      </span>
      <span>${option.text}</span>
    </span>
  `);
}

function getSubcategoryColor(catKey, subKey) {
  const cat = categoriesData[catKey];
  if (!cat) return '#999999';
  const sub = cat.subcategories[subKey];
  return typeof sub === 'object' && sub.color ? sub.color : cat.color;
}

function getSubcategoryIcon(catKey, subKey) {
  const cat = categoriesData[catKey];
  if (!cat) return 'fa-solid fa-map-marker-alt';
  const sub = cat.subcategories[subKey];
  if (typeof sub === 'object' && sub.icon) return sub.icon;
  return cat.icon || 'fa-solid fa-map-marker-alt';
}

// Cargar incidentes desde la API
async function loadIncidents() {
  try {
    loadingIndicator.style.display = 'flex';
    // Remover marcadores existentes
    Object.values(incidentMarkers).forEach(marker => map.removeLayer(marker));
    incidentMarkers = {};
    const response = await fetch('/api/incidents');
    if (!response.ok) throw new Error('Error loading incidents');
    const incidents = await response.json();
    incidents.forEach(incident => addIncidentToMap(incident));
  } catch (error) {
    console.error('Error loading incidents:', error);
  } finally {
    loadingIndicator.style.display = 'none';
  }
}

// Inicializar la interfaz de usuario y sus eventos
function initUI() {
  sidebarToggle.addEventListener('click', toggleSidebar);
  setupBottomsheetDrag();

  const closeBottomsheetBtn = document.getElementById('close-bottomsheet');
  if (closeBottomsheetBtn) {
    closeBottomsheetBtn.addEventListener('click', () => bottomsheet.classList.remove('expanded'));
  }

  initInfoModal();
  setupFormSync();
  setupFormSubmission();
  setInterval(loadIncidents, 60000);
  window.addEventListener('resize', handleWindowResize);
}

// Modal informativo
function initInfoModal() {
  const infoButton = document.getElementById('infoButton');
  const infoModal = document.getElementById('infoModal');
  const closeModal = document.querySelector('.close-modal');

  infoButton.addEventListener('click', () => infoModal.style.display = 'block');
  closeModal.addEventListener('click', () => infoModal.style.display = 'none');
  window.addEventListener('click', event => {
    if (event.target === infoModal) infoModal.style.display = 'none';
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && infoModal.style.display === 'block') {
      infoModal.style.display = 'none';
    }
  });
  setupCopyLink();
}

function setupCopyLink() {
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  if (!copyLinkBtn) return;
  copyLinkBtn.addEventListener('click', () => {
    const linkToCopy = window.location.origin || 'https://aguantebahia.com';
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(linkToCopy)
        .then(() => showCopiedConfirmation(copyLinkBtn))
        .catch(() => fallbackCopyMethod(linkToCopy, copyLinkBtn));
    } else {
      fallbackCopyMethod(linkToCopy, copyLinkBtn);
    }
  });
}

function fallbackCopyMethod(text, button) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  Object.assign(textArea.style, { position: 'fixed', opacity: '0' });
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand('copy');
    successful ? showCopiedConfirmation(button) : showErrorCopy(button);
  } catch (err) {
    console.error('Error al copiar: ', err);
    alert('No se pudo copiar el enlace. El enlace es: ' + text);
  }
  document.body.removeChild(textArea);
}

function showCopiedConfirmation(button) {
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-check"></i> Enlace copiado';
  button.classList.add('copied');
  setTimeout(() => {
    button.innerHTML = originalText;
    button.classList.remove('copied');
  }, 2000);
}

function showErrorCopy(button) {
  button.innerHTML = '<i class="fas fa-times"></i> Error al copiar';
  setTimeout(() => button.innerHTML = '<i class="fas fa-link"></i> Copiar enlace', 2000);
}

function toggleSidebar() {
  sidebar.classList.toggle('collapsed');
  if (sidebar.classList.contains('collapsed')) {
    toggleIcon.classList.replace('fa-chevron-left', 'fa-chevron-right');
  } else {
    toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left');
  }
}

// Arrastre del bottomsheet
function setupBottomsheetDrag() {
  if (!bottomsheetHandle) return;
  let startY, startHeight, isDragging = false;

  const dragStart = e => {
    e.preventDefault();
    isDragging = true;
    startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    startHeight = parseInt(getComputedStyle(bottomsheet).height, 10);
  };

  const drag = e => {
    if (!isDragging) return;
    const y = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    const deltaY = y - startY;
    if (deltaY < 0) {
      const newHeight = Math.min(startHeight - deltaY, window.innerHeight * 0.8);
      bottomsheet.style.height = `${newHeight}px`;
      bottomsheet.classList.add('expanded');
    } else if (deltaY > 50) {
      bottomsheet.classList.remove('expanded');
      bottomsheet.removeAttribute('style');
    }
  };

  const dragEnd = () => isDragging = false;

  bottomsheetHandle.addEventListener('mousedown', dragStart);
  bottomsheetHandle.addEventListener('touchstart', dragStart);
  window.addEventListener('mousemove', drag);
  window.addEventListener('touchmove', drag);
  window.addEventListener('mouseup', dragEnd);
  window.addEventListener('touchend', dragEnd);

  bottomsheetHandle.addEventListener('click', () => {
    if (!bottomsheet.classList.contains('expanded')) bottomsheet.classList.add('expanded');
  });
}

// Sincronización de formularios
function setupFormSync() {
  categorySelects.forEach(select => {
    select.addEventListener('change', function () {
      categorySelects.forEach(other => {
        if (other !== this) other.value = this.value;
      });
    });
  });

  urgentCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function () {
      urgentCheckboxes.forEach(other => {
        if (other !== this) other.checked = this.checked;
      });
    });
  });

  descriptionInputs.forEach(input => {
    input.addEventListener('input', function () {
      descriptionInputs.forEach(other => {
        if (other !== this) other.value = this.value;
      });
    });
  });
}

// Envío de formularios
function setupFormSubmission() {
  incidentForms.forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!selectedMarker) {
        showToast('Por favor, seleccione una ubicación en el mapa.', 'error');
        return;
      }
      const categorySelect = form.querySelector('.category-select');
      const descriptionInput = form.querySelector('.description-input');
      const urgentCheckbox = form.querySelector('.urgent-checkbox');

      if (!categorySelect.value) {
        showToast('Por favor, seleccione un tipo de incidente.', 'error');
        return;
      }

      const [category, subcategory] = categorySelect.value.split('.');
      const formData = {
        category,
        subcategory,
        description: descriptionInput.value,
        urgent: urgentCheckbox.checked,
        location: { lat: selectedLocation.lat, lng: selectedLocation.lng }
      };

      try {
        loadingIndicator.style.display = 'flex';
        const response = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error al enviar el reporte.');
        showToast('Reporte enviado con éxito!', 'success');
        incidentForms.forEach(f => f.reset());
        if (selectedMarker) {
          map.removeLayer(selectedMarker);
          selectedMarker = null;
          selectedLocation = null;
        }
        locationDisplays.forEach(display => display.textContent = 'Haga clic en el mapa para seleccionar una ubicación');
        sidebar.classList.add('collapsed');
        toggleIcon.classList.replace('fa-chevron-left', 'fa-chevron-right');
        bottomsheet.classList.remove('expanded');
        loadIncidents();
      } catch (error) {
        console.error('Error:', error);
        showToast('Error al enviar el reporte: ' + error.message, 'error');
      } finally {
        loadingIndicator.style.display = 'none';
      }
    });
  });
}

// Clic en el mapa para colocar marcador
function handleMapClick(e) {
  if (selectedMarker) map.removeLayer(selectedMarker);
  selectedMarker = L.marker(e.latlng).addTo(map);
  selectedLocation = e.latlng;
  locationDisplays.forEach(display => {
    display.textContent = `Lat: ${e.latlng.lat.toFixed(6)}, Lng: ${e.latlng.lng.toFixed(6)}`;
  });
  if (window.innerWidth <= 768) {
    bottomsheet.classList.add('expanded');
  } else {
    sidebar.classList.remove('collapsed');
    toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left');
  }
}

function handleWindowResize() {
  if (window.innerWidth > 768) bottomsheet.classList.remove('expanded');
}

function showToast(message, type = 'success', duration = 3000) {
  let toast = document.querySelector('.toast') || document.createElement('div');
  if (!toast.classList.contains('toast')) {
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'toast';
  if (type === 'error') toast.classList.add('error');
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), duration);
}

function addIncidentToMap(incident) {
  const category = categoriesData[incident.category];
  const subcategory = category?.subcategories[incident.subcategory];
  const color = getSubcategoryColor(incident.category, incident.subcategory);
  const iconClass = getSubcategoryIcon(incident.category, incident.subcategory);
  const incidentLocation = L.latLng(incident.location.lat, incident.location.lng);
  const iconHtml = `<i class="${iconClass}" style="color: ${color}; border: 2px solid ${color};"></i>`;
  const customIcon = L.divIcon({
    html: iconHtml,
    className: incident.urgent ? 'custom-marker-icon urgent' : 'custom-marker-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
  const marker = L.marker(incidentLocation, { icon: customIcon }).addTo(map);
  const categoryLabel = category ? category.label : 'Desconocido';
  const subcategoryLabel = category && subcategory ? (typeof subcategory === 'object' ? subcategory.label : subcategory) : 'Desconocido';
  const popupContent = `
    <div class="incident-popup">
      <h3>${subcategoryLabel}</h3>
      <p>${incident.description}</p>
      <p><small>Reportado: ${new Date(incident.timestamp).toLocaleString()}</small></p>
      ${incident.urgent ? '<p class="urgent-tag"><strong>¡URGENTE!</strong></p>' : ''}
    </div>
  `;
  marker.bindPopup(popupContent);
  incidentMarkers[incident.id] = marker;
}
