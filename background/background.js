/**
 * RecipeCart - Background Service Worker
 * Handles communication with Instacart and other background tasks
 */

import { addToInstacart } from '../utils/instacart.js';
import { saveRecipe, saveTabRecipe, getPreferences } from '../utils/storage.js';

// Listen for runtime messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle adding ingredients to Instacart
  if (request.action === 'addToInstacart') {
    handleAddToInstacart(request, sendResponse);
    return true; // Return true to indicate we'll respond asynchronously
  }
  
  // Handle saving a recipe
  if (request.action === 'saveRecipe') {
    handleSaveRecipe(request, sendResponse);
    return true;
  }
  
  // Handle tab recipe saving
  if (request.action === 'saveTabRecipe') {
    handleSaveTabRecipe(request, sender, sendResponse);
    return true;
  }
  
  // Handle user preferences
  if (request.action === 'getPreferences') {
    handleGetPreferences(sendResponse);
    return true;
  }
  
  // Handle premium status check
  if (request.action === 'checkPremium') {
    handleCheckPremium(sendResponse);
    return true;
  }
});

/**
 * Handle adding ingredients to Instacart
 * @param {object} request - The request object
 * @param {function} sendResponse - Function to send response
 */
async function handleAddToInstacart(request, sendResponse) {
  try {
    const result = await addToInstacart(
      request.ingredients,
      request.measurementSystem,
      request.multiplier
    );
    sendResponse(result);
  } catch (error) {
    console.error('Error adding to Instacart:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Failed to add items to Instacart.' 
    });
  }
}

/**
 * Handle saving a recipe
 * @param {object} request - The request object
 * @param {function} sendResponse - Function to send response
 */
async function handleSaveRecipe(request, sendResponse) {
  try {
    const result = await saveRecipe(request.recipe);
    sendResponse(result);
  } catch (error) {
    console.error('Error saving recipe:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Failed to save recipe.' 
    });
  }
}

/**
 * Handle saving a recipe for the current tab
 * @param {object} request - The request object
 * @param {object} sender - Sender information
 * @param {function} sendResponse - Function to send response
 */
async function handleSaveTabRecipe(request, sender, sendResponse) {
  try {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    
    if (!tabId) {
      throw new Error('No tab ID provided.');
    }
    
    const result = await saveTabRecipe(tabId, request.recipe);
    sendResponse(result);
  } catch (error) {
    console.error('Error saving tab recipe:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Failed to save tab recipe.' 
    });
  }
}

/**
 * Handle getting user preferences
 * @param {function} sendResponse - Function to send response
 */
async function handleGetPreferences(sendResponse) {
  try {
    const preferences = await getPreferences();
    sendResponse({ success: true, preferences });
  } catch (error) {
    console.error('Error getting preferences:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Failed to get preferences.' 
    });
  }
}

/**
 * Handle checking premium status
 * @param {function} sendResponse - Function to send response
 */
async function handleCheckPremium(sendResponse) {
  try {
    const preferences = await getPreferences();
    sendResponse({ 
      success: true, 
      isPremium: preferences.isPremium || false 
    });
  } catch (error) {
    console.error('Error checking premium status:', error);
    sendResponse({ 
      success: false, 
      isPremium: false,
      error: error.message || 'Failed to check premium status.' 
    });
  }
}

// Install and update handling
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    // Set up initial preferences and welcome message
    const initialPreferences = {
      defaultMeasurementSystem: 'us',
      defaultMultiplier: 1,
      autoSaveRecipes: false,
      isPremium: false // Default to free tier
    };
    
    chrome.storage.local.set({ 
      userPreferences: initialPreferences,
      firstInstall: true
    });
    
    // Open welcome page or tutorial
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome/welcome.html')
    });
  } else if (details.reason === 'update') {
    // Handle update logic if needed
    const previousVersion = details.previousVersion;
    const currentVersion = chrome.runtime.getManifest().version;
    
    // Log update
    console.log(`Updated from ${previousVersion} to ${currentVersion}`);
  }
});

// Tab closing handler
chrome.tabs.onRemoved.addListener(tabId => {
  // Clean up any tab-specific data when tab is closed
  chrome.storage.local.get(['currentTabId'], result => {
    if (result.currentTabId === tabId) {
      chrome.storage.local.remove(['currentTabId', 'currentRecipe']);
    }
  });
});