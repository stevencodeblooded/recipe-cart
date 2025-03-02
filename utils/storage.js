/**
 * RecipeCart - Storage Utilities
 * Functions for storing and retrieving data from browser storage
 */

/**
 * Save a recipe to local storage
 * @param {object} recipe - The recipe to save
 * @returns {Promise} Promise resolving to success status
 */
export function saveRecipe(recipe) {
    return new Promise((resolve, reject) => {
      // Generate a unique ID for the recipe if it doesn't have one
      if (!recipe.id) {
        recipe.id = generateUniqueId();
      }
      
      // Add timestamp
      recipe.savedAt = Date.now();
      
      // Get existing saved recipes
      chrome.storage.local.get(['savedRecipes'], result => {
        let savedRecipes = result.savedRecipes || [];
        
        // Check if recipe already exists
        const existingIndex = savedRecipes.findIndex(r => r.id === recipe.id);
        
        if (existingIndex !== -1) {
          // Update existing recipe
          savedRecipes[existingIndex] = recipe;
        } else {
          // Add new recipe
          savedRecipes.push(recipe);
        }
        
        // Save back to storage
        chrome.storage.local.set({ savedRecipes }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve({ success: true, recipe });
          }
        });
      });
    });
  }
  
  /**
   * Get all saved recipes
   * @returns {Promise} Promise resolving to array of saved recipes
   */
  export function getSavedRecipes() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['savedRecipes'], result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.savedRecipes || []);
        }
      });
    });
  }
  
  /**
   * Delete a saved recipe
   * @param {string} recipeId - ID of the recipe to delete
   * @returns {Promise} Promise resolving to success status
   */
  export function deleteRecipe(recipeId) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['savedRecipes'], result => {
        let savedRecipes = result.savedRecipes || [];
        
        // Filter out the recipe to delete
        savedRecipes = savedRecipes.filter(recipe => recipe.id !== recipeId);
        
        // Save back to storage
        chrome.storage.local.set({ savedRecipes }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve({ success: true });
          }
        });
      });
    });
  }
  
  /**
   * Save current recipe for a tab
   * @param {number} tabId - ID of the tab
   * @param {object} recipe - Recipe data for the tab
   * @returns {Promise} Promise resolving to success status
   */
  export function saveTabRecipe(tabId, recipe) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({
        currentTabId: tabId,
        currentRecipe: recipe
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve({ success: true });
        }
      });
    });
  }
  
  /**
   * Get current recipe for a tab
   * @param {number} tabId - ID of the tab
   * @returns {Promise} Promise resolving to recipe data or null
   */
  export function getTabRecipe(tabId) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['currentTabId', 'currentRecipe'], result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (result.currentTabId === tabId && result.currentRecipe) {
          resolve(result.currentRecipe);
        } else {
          resolve(null);
        }
      });
    });
  }
  
  /**
   * Save user preferences
   * @param {object} preferences - User preferences
   * @returns {Promise} Promise resolving to success status
   */
  export function savePreferences(preferences) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ userPreferences: preferences }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve({ success: true });
        }
      });
    });
  }
  
  /**
   * Get user preferences
   * @returns {Promise} Promise resolving to user preferences
   */
  export function getPreferences() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['userPreferences'], result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          // Default preferences if none found
          const defaultPreferences = {
            defaultMeasurementSystem: 'us',
            defaultMultiplier: 1,
            autoSaveRecipes: false,
            isPremium: false
          };
          
          resolve(result.userPreferences || defaultPreferences);
        }
      });
    });
  }
  
  /**
   * Get recent Instacart items
   * @returns {Promise} Promise resolving to recent Instacart items
   */
  export function getRecentInstacartItems() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['recentInstacartItems'], result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.recentInstacartItems || []);
        }
      });
    });
  }
  
  /**
   * Clear all storage data
   * @returns {Promise} Promise resolving to success status
   */
  export function clearAllData() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve({ success: true });
        }
      });
    });
  }
  
  /**
   * Generate a unique ID for recipes
   * @returns {string} Unique ID
   */
  function generateUniqueId() {
    return 'recipe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }