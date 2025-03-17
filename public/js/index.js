// src/index.js
import { initMap } from './features/map.js';
import { initCategories } from './features/categories.js';
import { initIncidents } from './features/incidents.js';
import { initSidebar } from './features/sidebar.js';
import { setupBottomsheetDrag } from './features/bottomsheet.js';
import { setupFormSync, setupFormSubmission } from './features/forms.js';
import { setupSearchBar } from './features/search.js';
import { showLoadingIndicator, hideLoadingIndicator } from './features/notifications.js';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    try {
      console.log("Starting application initialization...");
      
      // Show loading indicator during initialization
      console.log("Showing loading indicator");
      showLoadingIndicator();
      
      // Check if jQuery is available (required for the app)
      console.log("Checking for jQuery...");
      if (typeof jQuery === 'undefined') {
        console.error('jQuery is required for this application.');
        return;
      }
      console.log("jQuery is available ✓");
      
      // Initialize map first (core component)
      console.log("Initializing map...");
      const map = initMap();
      console.log("Map initialized ✓", map);
      
      // Initialize components in order of dependency
      console.log("Initializing categories...");
      await initCategories();
      console.log("Categories initialized ✓");
      
      console.log("Initializing incidents...");
      await initIncidents();
      console.log("Incidents initialized ✓");
      
      // Initialize UI components
      console.log("Initializing sidebar...");
      initSidebar();
      console.log("Sidebar initialized ✓");
      
      console.log("Setting up bottomsheet drag...");
      setupBottomsheetDrag();
      console.log("Bottomsheet drag setup complete ✓");
      
      console.log("Setting up form sync...");
      setupFormSync();
      console.log("Form sync setup complete ✓");
      
      console.log("Setting up form submission...");
      setupFormSubmission();
      console.log("Form submission setup complete ✓");
      
      console.log("Setting up search bar...");
      setupSearchBar();
      console.log("Search bar setup complete ✓");
      
      // Hide loading indicator when done
      console.log("Hiding loading indicator");
      hideLoadingIndicator();
      
      console.log("Application initialization complete! ✓");
    } catch (error) {
      console.error('Error initializing application:', error);
      console.error('Error stack:', error.stack);
      console.error('Error occurred at:', new Date().toISOString());
      console.error('Browser:', navigator.userAgent);
      
      alert('Error initializing application: ' + error.message + '. Please refresh the page.');
      hideLoadingIndicator();
    }
  }