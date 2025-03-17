// src/features/sidebar.js

// Module state
let sidebar;
let sidebarToggle;
let toggleIcon;

/**
 * Initialize the sidebar
 */
export function initSidebar() {
  // Get DOM elements
  sidebar = document.querySelector('.sidebar');
  sidebarToggle = document.querySelector('.sidebar-toggle');
  toggleIcon = document.getElementById('toggle-icon');
  
  if (!sidebar || !sidebarToggle || !toggleIcon) {
    console.error('Sidebar elements not found in the DOM');
    return;
  }
  
  // Set up event listener for toggle button
  sidebarToggle.addEventListener('click', toggleSidebar);
  
  // Initialize info modal
  initInfoModal();
}

/**
 * Toggle sidebar visibility
 */
export function toggleSidebar() {
  if (!sidebar || !toggleIcon) return;
  
  sidebar.classList.toggle('collapsed');
  
  if (sidebar.classList.contains('collapsed')) {
    toggleIcon.classList.replace('fa-chevron-left', 'fa-chevron-right');
  } else {
    toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left');
  }
}

/**
 * Expand the sidebar
 */
export function expandSidebar() {
  if (!sidebar || !toggleIcon) return;
  
  sidebar.classList.remove('collapsed');
  toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left');
}

/**
 * Collapse the sidebar
 */
export function collapseSidebar() {
  if (!sidebar || !toggleIcon) return;
  
  sidebar.classList.add('collapsed');
  toggleIcon.classList.replace('fa-chevron-left', 'fa-chevron-right');
}

/**
 * Initialize info modal functionality
 */
function initInfoModal() {
  const infoButton = document.getElementById('infoButton');
  const infoModal = document.getElementById('infoModal');
  const closeModal = document.querySelector('.close-modal');
  
  if (!infoButton || !infoModal || !closeModal) {
    console.warn('Info modal elements not found');
    return;
  }
  
  // Open modal when info button is clicked
  infoButton.addEventListener('click', () => {
    infoModal.style.display = 'block';
  });
  
  // Close modal when close button is clicked
  closeModal.addEventListener('click', () => {
    infoModal.style.display = 'none';
  });
  
  // Close modal when clicking outside of it
  window.addEventListener('click', event => {
    if (event.target === infoModal) {
      infoModal.style.display = 'none';
    }
  });
  
  // Close modal when Escape key is pressed
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && infoModal.style.display === 'block') {
      infoModal.style.display = 'none';
    }
  });
  
  // Set up copy link functionality
  setupCopyLink();
}

/**
 * Set up copy link functionality
 */
function setupCopyLink() {
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  
  if (!copyLinkBtn) {
    console.warn('Copy link button not found');
    return;
  }
  
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

/**
 * Fallback method for copying to clipboard
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - Button element
 */
function fallbackCopyMethod(text, button) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  
  // Make the textarea invisible
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

/**
 * Show confirmation that link was copied
 * @param {HTMLElement} button - Button element
 */
function showCopiedConfirmation(button) {
  const originalText = button.innerHTML;
  
  button.innerHTML = '<i class="fas fa-check"></i> Enlace copiado';
  button.classList.add('copied');
  
  setTimeout(() => {
    button.innerHTML = originalText;
    button.classList.remove('copied');
  }, 2000);
}

/**
 * Show error when copying fails
 * @param {HTMLElement} button - Button element
 */
function showErrorCopy(button) {
  button.innerHTML = '<i class="fas fa-times"></i> Error al copiar';
  
  setTimeout(() => {
    button.innerHTML = '<i class="fas fa-link"></i> Copiar enlace';
  }, 2000);
}