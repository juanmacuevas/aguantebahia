// src/features/categories.js
import { apiService } from '../services/api.js';
import { showToast } from './notifications.js';

// Module state
let categoriesData = {};
let categorySelects = [];

/**
 * Initialize categories module
 * @returns {Promise<Object>} - Categories data
 */
export async function initCategories() {
  try {
    // Get all category select elements
    categorySelects = document.querySelectorAll('.category-select');
    
    // Load categories data
    categoriesData = await apiService.getCategories();
    
    // Populate the category selects
    populateCategorySelects();
    
    return categoriesData;
  } catch (error) {
    console.error('Error initializing categories:', error);
    showToast('Error al cargar las categorías. Por favor, recargue la página.', 'error');
    throw error;
  }
}

/**
 * Populate the category select dropdowns
 */
function populateCategorySelects() {
  categorySelects.forEach(select => {
    // Clear existing options
    select.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Seleccionar...';
    select.appendChild(defaultOption);
    
    // Add categories and subcategories
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
    
    // Initialize Select2 and sync selection between forms
    $(select).select2({
      placeholder: "Seleccionar tipo de incidente...",
      allowClear: true,
      templateResult: formatCategoryOption,
      templateSelection: formatCategoryOption
    }).on('select2:select', function() {
      categorySelects.forEach(otherSelect => {
        if (otherSelect !== this) {
          $(otherSelect).val(this.value).trigger('change');
        }
      });
    });
  });
}

/**
 * Format a category option for Select2
 * @param {Object} option - Select2 option object
 * @returns {jQuery|string} - Formatted option
 */
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

/**
 * Get color for a subcategory
 * @param {string} catKey - Category key
 * @param {string} subKey - Subcategory key
 * @returns {string} - Color code
 */
export function getSubcategoryColor(catKey, subKey) {
  const cat = categoriesData[catKey];
  if (!cat) return '#999999';
  
  const sub = cat.subcategories[subKey];
  return typeof sub === 'object' && sub.color ? sub.color : cat.color;
}

/**
 * Get icon for a subcategory
 * @param {string} catKey - Category key
 * @param {string} subKey - Subcategory key
 * @returns {string} - Icon CSS class
 */
export function getSubcategoryIcon(catKey, subKey) {
  const cat = categoriesData[catKey];
  if (!cat) return 'fa-solid fa-map-marker-alt';
  
  const sub = cat.subcategories[subKey];
  if (typeof sub === 'object' && sub.icon) return sub.icon;
  return cat.icon || 'fa-solid fa-map-marker-alt';
}

/**
 * Get category name from category and subcategory keys
 * @param {string} catKey - Category key
 * @param {string} subKey - Subcategory key
 * @returns {string} - Human readable name
 */
export function getCategoryName(catKey, subKey) {
  const cat = categoriesData[catKey];
  if (!cat) return `${catKey} - ${subKey}`;
  
  const sub = cat.subcategories[subKey];
  if (!sub) return cat.label;
  
  return typeof sub === 'object' ? sub.label : sub;
}

/**
 * Get categories data
 * @returns {Object} - The categories data
 */
export function getCategoriesData() {
  return categoriesData;
}