// src/features/bottomsheet.js
import { uiConfig } from '../config.js';

// Module state
let bottomsheet;
let bottomsheetHandle;
let startY, startHeight, isDragging = false;

/**
 * Set up the bottomsheet drag functionality
 */
export function setupBottomsheetDrag() {
  // Get DOM elements
  bottomsheet = document.querySelector('.bottomsheet');
  bottomsheetHandle = document.querySelector('.bottomsheet-handle');
  
  if (!bottomsheetHandle || !bottomsheet) {
    console.warn('Bottomsheet elements not found');
    return;
  }
  
  // Set up drag events
  bottomsheetHandle.addEventListener('mousedown', dragStart);
  bottomsheetHandle.addEventListener('touchstart', dragStart);
  
  window.addEventListener('mousemove', drag);
  window.addEventListener('touchmove', drag);
  
  window.addEventListener('mouseup', dragEnd);
  window.addEventListener('touchend', dragEnd);
  
  // Handle click on the handle to expand
  bottomsheetHandle.addEventListener('click', () => {
    if (!bottomsheet.classList.contains('expanded')) {
      expandBottomsheet();
    }
  });
  
  // Set up close button
  const closeBottomsheetBtn = document.getElementById('close-bottomsheet');
  if (closeBottomsheetBtn) {
    closeBottomsheetBtn.addEventListener('click', collapseBottomsheet);
  }
  
  // Handle window resize
  window.addEventListener('resize', handleWindowResize);
}

/**
 * Handle drag start event
 * @param {Event} e - Mouse or touch event
 */
function dragStart(e) {
  e.preventDefault();
  isDragging = true;
  
  // Get starting position
  startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
  startHeight = parseInt(getComputedStyle(bottomsheet).height, 10);
}

/**
 * Handle drag event
 * @param {Event} e - Mouse or touch event
 */
function drag(e) {
  if (!isDragging) return;
  
  // Get current position
  const y = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
  const deltaY = y - startY;
  
  if (deltaY < 0) {
    // Dragging up - expand bottomsheet
    const newHeight = Math.min(startHeight - deltaY, window.innerHeight * uiConfig.bottomsheet.maxHeight);
    bottomsheet.style.height = `${newHeight}px`;
    bottomsheet.classList.add('expanded');
  } else if (deltaY > uiConfig.bottomsheet.dragThreshold) {
    // Dragging down beyond threshold - collapse bottomsheet
    collapseBottomsheet();
  }
}

/**
 * Handle drag end event
 */
function dragEnd() {
  isDragging = false;
}

/**
 * Expand the bottomsheet
 */
export function expandBottomsheet() {
  if (!bottomsheet) return;
  bottomsheet.classList.add('expanded');
}

/**
 * Collapse the bottomsheet
 */
export function collapseBottomsheet() {
  if (!bottomsheet) return;
  bottomsheet.classList.remove('expanded');
  bottomsheet.removeAttribute('style');
}

/**
 * Handle window resize event
 */
function handleWindowResize() {
  // If window is wider than mobile breakpoint, collapse bottomsheet
  if (window.innerWidth > 768 && bottomsheet) {
    collapseBottomsheet();
  }
}