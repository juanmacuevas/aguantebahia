// src/features/notifications.js
import { uiConfig } from '../config.js';

// Reference to the loading indicator element
let loadingIndicator;

// Reference to the toast element
let toastElement;

/**
 * Initialize loading indicator reference
 */
function initLoadingIndicator() {
  if (!loadingIndicator) {
    loadingIndicator = document.querySelector('.loading');
  }
}

/**
 * Display the loading indicator
 */
export function showLoadingIndicator() {
  initLoadingIndicator();
  if (loadingIndicator) {
    loadingIndicator.style.display = 'flex';
  }
}

/**
 * Hide the loading indicator
 */
export function hideLoadingIndicator() {
  initLoadingIndicator();
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

/**
 * Display a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification ('success' or 'error')
 * @param {number} duration - Duration in milliseconds
 */
export function showToast(message, type = 'success', duration = uiConfig.toastDuration) {
  // Create or reuse toast element
  if (!toastElement) {
    toastElement = document.querySelector('.toast');
    if (!toastElement) {
      toastElement = document.createElement('div');
      toastElement.className = 'toast';
      document.body.appendChild(toastElement);
    }
  }
  
  // Clear any existing classes and timeouts
  toastElement.className = 'toast';
  clearTimeout(toastElement.timeout);
  
  // Set content and type
  toastElement.textContent = message;
  if (type === 'error') {
    toastElement.classList.add('error');
  }
  
  // Show the toast with a small delay to ensure the transition works
  setTimeout(() => toastElement.classList.add('show'), 10);
  
  // Hide the toast after the specified duration
  toastElement.timeout = setTimeout(() => {
    toastElement.classList.remove('show');
  }, duration);
}