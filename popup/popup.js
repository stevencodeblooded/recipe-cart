/**
 * RecipeCart - Popup Script
 * Handles user interactions in the popup UI
 */

import { formatIngredient } from '../utils/parser.js';
import { getPreferences, savePreferences } from '../utils/storage.js';

// State variables
let currentRecipe = null;
let currentMeasurementSystem = 'us'; // 'us' or 'metric'
let currentMultiplier = 1; // 1x, 2x, or 3x
let currentService = 'instacart'; // 'instacart', 'amazon', or 'ubereats'
let isPremium = false; // Premium status

// DOM Elements
const initialState = document.getElementById('initial-state');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const recipeState = document.getElementById('recipe-state');
const successState = document.getElementById('success-state');
const premiumPromoState = document.getElementById('premium-promo-state');
const notificationToast = document.getElementById('notification-toast');

const errorMessage = document.getElementById('error-message');
const recipeTitle = document.getElementById('recipe-title');
const ingredientsList = document.getElementById('ingredients-list');
const notificationMessage = document.getElementById('notification-message');
const serviceSelector = document.getElementById('service-selector');
const serviceLinks = document.getElementById('service-links');

// Buttons
const extractBtn = document.getElementById('extract-btn');
const tryAgainBtn = document.getElementById('try-again-btn');
const sendToServiceBtn = document.getElementById('send-to-service-btn');
const copyAllBtn = document.getElementById('copy-all-btn');
const resetBtn = document.getElementById('reset-btn');
const backToRecipeBtn = document.getElementById('back-to-recipe-btn');
const closeNotificationBtn = document.getElementById('close-notification-btn');
const upgradeBtn = document.getElementById('upgrade-btn');
const premiumCloseBtn = document.getElementById('premium-close-btn');

// Toggle buttons
const toggleUs = document.getElementById('toggle-us');
const toggleMetric = document.getElementById('toggle-metric');
const multiplierBtns = document.querySelectorAll('.multiplier-btn');

// Service URLs - base URLs for each service
const serviceURLs = {
  instacart: 'https://www.instacart.com/store/',
  amazon: 'https://www.amazon.com',
  ubereats: 'https://www.ubereats.com/search'
};

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  setupEventListeners();
});

/**
 * Initialize the popup and check for active tab's recipe data
 */
async function initializePopup() {
  try {
    // Check premium status
    const statusResponse = await chrome.runtime.sendMessage({ action: 'checkPremium' });
    isPremium = statusResponse.isPremium;
    
    // Get user preferences
    const prefResponse = await chrome.runtime.sendMessage({ action: 'getPreferences' });
    if (prefResponse.success) {
      const prefs = prefResponse.preferences;
      currentMeasurementSystem = prefs.defaultMeasurementSystem || 'us';
      currentMultiplier = prefs.defaultMultiplier || 1;
      currentService = prefs.defaultService || 'instacart';
      
      // Update UI to reflect preferences
      setMeasurementSystem(currentMeasurementSystem, false);
      setMultiplier(currentMultiplier, false);
      
      // Set service selector
      if (serviceSelector) {
        serviceSelector.value = currentService;
      }
      
      // Update send button text
      updateSendButtonText();
    }
    
    // Show loading state while initializing
    showState(loadingState);
    
    // Check if current tab has recipe data
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    
    if (!activeTab) {
      showErrorState('Unable to access the current tab.');
      return;
    }
    
    // Get storage data
    const storageData = await new Promise(resolve => {
      chrome.storage.local.get(['currentTabId', 'currentRecipe'], resolve);
    });
    
    if (storageData.currentTabId === activeTab.id && storageData.currentRecipe) {
      // We have cached recipe data for this tab
      currentRecipe = storageData.currentRecipe;
      renderRecipe(currentRecipe);
      showState(recipeState);
    } else {
      // No cached data, show initial state
      showState(initialState);
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showErrorState('Failed to initialize. Please try again.');
  }
}

/**
 * Set up all event listeners for the popup
 */
function setupEventListeners() {
  // Extract button
  extractBtn.addEventListener('click', extractIngredients);
  
  // Try again button
  tryAgainBtn.addEventListener('click', () => {
    showState(initialState);
  });
  
  // Send to service button
  sendToServiceBtn.addEventListener('click', sendToService);
  
  // Copy all button
  copyAllBtn.addEventListener('click', copyAllIngredients);
  
  // Reset button
  resetBtn.addEventListener('click', resetExtraction);
  
  // Back to recipe button
  backToRecipeBtn.addEventListener('click', () => {
    showState(recipeState);
  });
  
  // Close notification button
  closeNotificationBtn.addEventListener('click', hideNotification);
  
  // Premium buttons
  upgradeBtn.addEventListener('click', handleUpgrade);
  premiumCloseBtn.addEventListener('click', () => {
    showState(recipeState);
  });
  
  // Measurement system toggle
  toggleUs.addEventListener('click', () => setMeasurementSystem('us'));
  toggleMetric.addEventListener('click', () => setMeasurementSystem('metric'));
  
  // Multiplier buttons
  multiplierBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const multiplier = parseInt(btn.getAttribute('data-multiplier'), 10);
      setMultiplier(multiplier);
    });
  });
  
  // Service selector
  serviceSelector.addEventListener('change', () => {
    currentService = serviceSelector.value;
    updateSendButtonText();
    
    // Save preference
    savePreferences({
      defaultService: currentService
    });
  });
}

/**
 * Update the send button text based on selected service
 */
function updateSendButtonText() {
  const serviceNames = {
    'instacart': 'Instacart',
    'amazon': 'Amazon Fresh',
    'ubereats': 'Uber Eats'
  };
  
  const serviceName = serviceNames[currentService] || 'Service';
  sendToServiceBtn.innerHTML = `<span class="btn-icon">🛒</span> Send to ${serviceName}`;
}

/**
 * Extract ingredients from the current active tab
 */
async function extractIngredients() {
  showState(loadingState);
  
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    
    if (!activeTab) {
      showErrorState('Unable to access the current tab.');
      return;
    }
    
    // First, try to inject the content script if it's not already there
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content/content.js']
      });
    } catch (injectError) {
      console.log('Content script may already be loaded:', injectError);
      // Continue anyway, the script might already be there
    }
    
    // Now try to send the message
    const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'extractIngredients' });
    
    if (!response || !response.success) {
      showErrorState('Could not find recipe ingredients on this page.');
      return;
    }
    
    // Successfully extracted ingredients
    currentRecipe = response.ingredients;
    
    // Cache the recipe data for this tab
    chrome.storage.local.set({
      currentTabId: activeTab.id,
      currentRecipe: currentRecipe
    });
    
    // Set the measurement system based on recipe data
    if (currentRecipe.measurementSystem) {
      setMeasurementSystem(currentRecipe.measurementSystem);
    }
    
    // Set the multiplier based on recipe data
    if (currentRecipe.multiplier) {
      setMultiplier(currentRecipe.multiplier);
    }
    
    // Render the recipe and show the recipe state
    renderRecipe(currentRecipe);
    showState(recipeState);
    
    // Apply smooth transition animations
    recipeState.classList.add('fade-in', 'slide-up');
    setTimeout(() => {
      recipeState.classList.remove('fade-in', 'slide-up');
    }, 300);
  } catch (error) {
    console.error('Extraction error:', error);
    showErrorState('An error occurred during extraction. Please try again.');
  }
}

/**
 * Render recipe data to the UI
 */
function renderRecipe(recipe) {
  // Set recipe title
  recipeTitle.textContent = recipe.title || 'Recipe Ingredients';

  // Show or hide multiplier controls based on recipe data
  const multiplierControls = document.querySelector('.multiplier-controls');
  if (recipe.multiplier && recipe.multiplier > 0) {
    // Recipe has multiplier, show controls
    multiplierControls.style.display = 'flex';
  } else {
    // Recipe doesn't have multiplier, hide controls
    multiplierControls.style.display = 'none';
  }
  
  // Clear existing ingredient list
  ingredientsList.innerHTML = '';
  
  // Create ingredient items
  recipe.ingredients.forEach((ingredient, index) => {
    // Format the ingredient based on current settings
    const formattedIngredient = formatIngredient(
      ingredient, 
      currentMeasurementSystem, 
      currentMultiplier
    );
    
    const li = document.createElement('li');
    li.className = 'ingredient-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'ingredient-checkbox';
    checkbox.id = `ingredient-${index}`;
    
    const textContainer = document.createElement('div');
    textContainer.className = 'ingredient-text';
    
    // Format the ingredient text
    if (formattedIngredient.amount) {
      const span = document.createElement('span');
      span.className = 'ingredient-amount';
      span.textContent = formattedIngredient.amount;
      textContainer.appendChild(span);
    }
    
    if (formattedIngredient.unit) {
      const span = document.createElement('span');
      span.className = 'ingredient-unit';
      span.textContent = formattedIngredient.unit;
      textContainer.appendChild(span);
    }
    
    if (formattedIngredient.name) {
      const span = document.createElement('span');
      span.className = 'ingredient-name';
      span.textContent = formattedIngredient.name;
      textContainer.appendChild(span);
    }
    
    if (formattedIngredient.notes) {
      const notesDiv = document.createElement('div');
      notesDiv.className = 'ingredient-notes';
      notesDiv.textContent = formattedIngredient.notes;
      textContainer.appendChild(notesDiv);
    }
    
    li.appendChild(checkbox);
    li.appendChild(textContainer);
    ingredientsList.appendChild(li);
  });
}

/**
 * Set the measurement system and update UI
 */
function setMeasurementSystem(system, updateRecipe = true) {
  if (system !== 'us' && system !== 'metric') {
    return;
  }
  
  currentMeasurementSystem = system;
  
  // Update toggle buttons
  toggleUs.classList.toggle('toggle-active', system === 'us');
  toggleMetric.classList.toggle('toggle-active', system === 'metric');
  
  // Save preference
  savePreferences({
    defaultMeasurementSystem: system
  });
  
  // If we have a recipe, update the display
  if (currentRecipe && updateRecipe) {
    renderRecipe(currentRecipe);
  }
}

/**
 * Set the recipe multiplier and update UI
 */
function setMultiplier(multiplier, updateRecipe = true) {
  if (![1, 2, 3].includes(multiplier)) {
    return;
  }
  
  currentMultiplier = multiplier;
  
  // Update multiplier buttons
  multiplierBtns.forEach(btn => {
    const btnMultiplier = parseInt(btn.getAttribute('data-multiplier'), 10);
    btn.classList.toggle('multiplier-active', btnMultiplier === multiplier);
  });
  
  // Save preference
  savePreferences({
    defaultMultiplier: multiplier
  });
  
  // If we have a recipe, update the display
  if (currentRecipe && updateRecipe) {
    renderRecipe(currentRecipe);
  }
}

/**
 * Send ingredients to the selected service
 */
async function sendToService() {
  if (!currentRecipe) {
    showNotification('No recipe loaded. Please extract a recipe first.');
    return;
  }
  
  showState(loadingState);
  
  try {
    // Collect selected ingredients
    const checkboxes = document.querySelectorAll('.ingredient-checkbox');
    const selectedIndices = [];
    
    let hasSelected = false;
    checkboxes.forEach((checkbox, index) => {
      if (checkbox.checked) {
        hasSelected = true;
        selectedIndices.push(index);
      }
    });
    
    // If none selected, use all
    const indices = hasSelected ? selectedIndices : [...Array(currentRecipe.ingredients.length).keys()];
    
    // Format selected ingredients
    const selectedIngredients = indices.map(i => {
      const ingredient = currentRecipe.ingredients[i];
      return formatIngredient(ingredient, currentMeasurementSystem, currentMultiplier);
    });
    
    // Create search terms focusing on the main ingredient name
    const searchTerms = selectedIngredients.map(ingredient => {
      let searchTerm = ingredient.name;
      // Remove any additional descriptors
      searchTerm = searchTerm.replace(/\(.*?\)/g, '').trim();
      return encodeURIComponent(searchTerm);
    });
    
    if (searchTerms.length === 0) {
      throw new Error('No ingredients selected.');
    }
    
    // Clear any previous checked ingredients
    chrome.storage.local.remove(['checkedIngredients']);
    
    // Store the search terms and service in local storage for the content script to access
    chrome.storage.local.set({
      instacartSearchTerms: searchTerms,
      amazonSearchTerms: searchTerms,
      ubereatsSearchTerms: searchTerms,
      currentService: currentService
    });
    
    // Determine which service URL to use
    let serviceURL;
    switch (currentService) {
      case 'amazon':
        serviceURL = 'https://www.amazon.com';
        break;
      case 'ubereats':
        serviceURL = 'https://www.ubereats.com/ke/feed';
        break;
      case 'instacart':
      default:
        serviceURL = 'https://www.instacart.com/store/';
        break;
    }
    
    // Create a tab for the selected service
    chrome.tabs.create({
      url: serviceURL
    });
    
    // Update success state with service-specific links
    serviceLinks.innerHTML = '';
    
    const createServiceLink = (service, name, url) => {
      const link = document.createElement('a');
      link.href = url;
      link.className = `service-link service-${service}`;
      link.target = '_blank';
      link.textContent = name;
      serviceLinks.appendChild(link);
    };
    
    // Add links based on selected service
    switch (currentService) {
      case 'amazon':
        createServiceLink('amazon', 'Go to Amazon Fresh Cart', 'https://www.amazon.com/gp/cart/view.html');
        break;
      case 'ubereats':
        createServiceLink('ubereats', 'Go to Uber Eats Cart', 'https://www.ubereats.com/checkout');
        break;
      case 'instacart':
      default:
        createServiceLink('instacart', 'Go to Instacart Cart', 'https://www.instacart.com/store/cart');
        break;
    }
    
    // Update success state message
    showState(successState);
    const successElement = document.querySelector('#success-state p');
    if (successElement) {
      successElement.textContent = `Ingredients have been sent to ${currentService === 'instacart' ? 'Instacart' : 
                                   currentService === 'amazon' ? 'Amazon Fresh' : 'Uber Eats'}. Use the floating panel to easily add each item to your cart.`;
    }
    
  } catch (error) {
    console.error('Service error:', error);
    showErrorState(error.message || `Failed to start ${currentService} shopping.`);
  }
}

/**
 * Copy all ingredients to clipboard
 */
async function copyAllIngredients() {
  if (!currentRecipe) {
    showNotification('No recipe loaded. Please extract a recipe first.');
    return;
  }
  
  try {
    // Format ingredients as text
    const ingredientTexts = currentRecipe.ingredients.map(ingredient => {
      const formatted = formatIngredient(ingredient, currentMeasurementSystem, currentMultiplier);
      
      let text = '';
      if (formatted.amount) text += formatted.amount + ' ';
      if (formatted.unit) text += formatted.unit + ' ';
      if (formatted.name) text += formatted.name;
      if (formatted.notes) text += ' (' + formatted.notes + ')';
      return text.trim();
    });
    
    const textToCopy = ingredientTexts.join('\n');
    
    // Copy to clipboard
    await navigator.clipboard.writeText(textToCopy);
    
    // Show success notification
    showNotification('Ingredients copied to clipboard!');
  } catch (error) {
    console.error('Copy error:', error);
    showNotification('Failed to copy ingredients to clipboard.');
  }
}

/**
 * Reset the extraction state
 */
function resetExtraction() {
  // Clear current recipe data
  currentRecipe = null;
  
  // Clear cached recipe data for this tab
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const activeTab = tabs[0];
    if (activeTab) {
      chrome.storage.local.remove(['currentTabId', 'currentRecipe']);
    }
  });
  
  // Show initial state
  showState(initialState);
}

/**
 * Handle premium upgrade
 */
function handleUpgrade() {
  // In a real extension, this would open a payment page or subscription flow
  // For this demo, we'll simulate upgrading to premium
  
  try {
    // Update preferences to premium
    savePreferences({
      isPremium: true
    });
    
    isPremium = true;
    
    // Show success notification
    showNotification('Upgraded to premium successfully!');
    
    // Return to recipe state
    showState(recipeState);
  } catch (error) {
    console.error('Upgrade error:', error);
    showNotification('Failed to process upgrade.');
  }
}

/**
 * Show notification toast
 */
function showNotification(message, duration = 3000) {
  notificationMessage.textContent = message;
  notificationToast.classList.remove('hidden');
  
  // Auto-hide after duration
  setTimeout(() => {
    hideNotification();
  }, duration);
}

/**
 * Hide notification toast
 */
function hideNotification() {
  notificationToast.classList.add('hidden');
}

/**
 * Show error state with custom message
 */
function showErrorState(message) {
  errorMessage.textContent = message || 'An error occurred.';
  showState(errorState);
}

/**
 * Show a specific state and hide others
 */
function showState(stateToShow) {
  // Hide all states
  initialState.classList.add('hidden');
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  recipeState.classList.add('hidden');
  successState.classList.add('hidden');
  premiumPromoState.classList.add('hidden');
  
  // Show the requested state
  stateToShow.classList.remove('hidden');
}