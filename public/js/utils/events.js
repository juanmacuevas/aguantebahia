// src/utils/events.js

/**
 * Simple event bus for communication between modules
 * Implements the publish-subscribe pattern
 */
class EventBus {
  constructor() {
    this.events = {};
  }
  
  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to execute when event is emitted
   * @returns {Function} - Unsubscribe function
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    
    this.events[event].push(callback);
    
    // Return function to unsubscribe
    return () => this.off(event, callback);
  }
  
  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Data to pass to callbacks
   */
  emit(event, data) {
    if (!this.events[event]) {
      return;
    }
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error);
      }
    });
  }
  
  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (!this.events[event]) {
      return;
    }
    
    this.events[event] = this.events[event].filter(cb => cb !== callback);
    
    // Clean up empty event arrays
    if (this.events[event].length === 0) {
      delete this.events[event];
    }
  }
  
  /**
   * Subscribe to an event and automatically unsubscribe after it fires once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  once(event, callback) {
    const unsubscribe = this.on(event, data => {
      unsubscribe();
      callback(data);
    });
    
    return unsubscribe;
  }
}

// Create and export a singleton instance
export const eventBus = new EventBus();