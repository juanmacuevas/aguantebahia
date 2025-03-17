// src/features/forms.js
import { submitIncident } from './incidents.js';
import { getSelectedLocation, clearSelectedMarker } from './map.js';
import { showToast } from './notifications.js';
import { collapseSidebar } from './sidebar.js';
import { collapseBottomsheet } from './bottomsheet.js';

// Module state
let incidentForms = [];
let urgentCheckboxes = [];
let descriptionInputs = [];

/**
 * Set up synchronization between different form instances
 */
export function setupFormSync() {
  // Get form elements
  incidentForms = document.querySelectorAll('.incident-form');
  urgentCheckboxes = document.querySelectorAll('.urgent-checkbox');
  descriptionInputs = document.querySelectorAll('.description-input');
  
  // Sync checkbox state between forms
  urgentCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      urgentCheckboxes.forEach(other => {
        if (other !== this) other.checked = this.checked;
      });
    });
  });
  
  // Sync description input between forms
  descriptionInputs.forEach(input => {
    input.addEventListener('input', function() {
      descriptionInputs.forEach(other => {
        if (other !== this) other.value = this.value;
      });
    });
  });
}

/**
 * Set up form submission handling
 */
export function setupFormSubmission() {
  incidentForms.forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      
      // Check if location is selected
      const selectedLocation = getSelectedLocation();
      if (!selectedLocation) {
        showToast('Por favor, seleccione una ubicación en el mapa.', 'error');
        return;
      }
      
      // Get form elements
      const categorySelect = form.querySelector('.category-select');
      const descriptionInput = form.querySelector('.description-input');
      const urgentCheckbox = form.querySelector('.urgent-checkbox');
      
      // Validate category selection
      if (!categorySelect.value) {
        showToast('Por favor, seleccione un tipo de incidente.', 'error');
        return;
      }
      
      // Parse category and subcategory
      const [category, subcategory] = categorySelect.value.split('.');
      
      // Create form data object
      const formData = {
        category,
        subcategory,
        description: descriptionInput.value,
        urgent: urgentCheckbox.checked,
        location: {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng
        }
      };
      
      try {
        // Submit the incident
        await submitIncident(formData);
        
        // Reset forms
        resetForms();
        
        // Clear selected marker
        clearSelectedMarker();
        
        // Collapse UI elements
        collapseSidebar();
        collapseBottomsheet();
      } catch (error) {
        console.error('Form submission error:', error);
      }
    });
  });
}

/**
 * Reset all forms
 */
export function resetForms() {
  incidentForms.forEach(form => form.reset());
  
  // Reset Select2 dropdowns
  const categorySelects = document.querySelectorAll('.category-select');
  categorySelects.forEach(select => {
    $(select).val('').trigger('change');
  });
  
  // Reset location displays
  const locationDisplays = document.querySelectorAll('.location-display');
  locationDisplays.forEach(display => {
    display.textContent = 'Haga clic en el mapa para seleccionar una ubicación';
    display.classList.remove('selected');
  });
}