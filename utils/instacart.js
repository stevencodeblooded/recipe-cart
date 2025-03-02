/**
 * RecipeCart - Instacart Integration Utilities
 * Handles sending ingredients to Instacart
 */

import { formatAmount } from './parser.js';

/**
 * Format an ingredient for Instacart search
 * @param {object} ingredient - The ingredient object
 * @param {string} measurementSystem - The measurement system ('us' or 'metric')
 * @param {number} multiplier - The recipe multiplier
 * @returns {string} Formatted search query for Instacart
 */
export function formatIngredientForSearch(ingredient, measurementSystem, multiplier) {
  // Start with the ingredient name as the primary search term
  let searchQuery = ingredient.name || '';
  
  // We don't include the amount/unit in the search query because
  // Instacart searches by product name, not by quantity
  
  return searchQuery.trim();
}

/**
 * Calculate the quantity to add to the Instacart cart
 * @param {object} ingredient - The ingredient object
 * @param {number} multiplier - The recipe multiplier
 * @returns {number} Quantity to add to cart
 */
export function calculateQuantity(ingredient, multiplier) {
  // Try to extract numeric quantity from the ingredient
  let quantity = 1; // Default to 1 item
  
  // If the ingredient has an amount and it's a whole number, use it as the quantity
  if (ingredient.amount) {
    const numericAmount = parseFloat(ingredient.amount);
    if (!isNaN(numericAmount) && numericAmount % 1 === 0) {
      quantity = Math.max(1, Math.round(numericAmount * multiplier));
    }
  }
  
  return quantity;
}

/**
 * Add ingredients to Instacart cart
 * @param {Array} ingredients - List of ingredients to add
 * @param {string} measurementSystem - 'us' or 'metric'
 * @param {number} multiplier - Recipe multiplier (1, 2, or 3)
 * @returns {Promise} Promise resolving to success status
 */
export async function addToInstacart(ingredients, measurementSystem, multiplier) {
  try {
    // Format ingredients for Instacart
    const formattedItems = ingredients.map(ingredient => ({
      query: formatIngredientForSearch(ingredient, measurementSystem, multiplier),
      quantity: calculateQuantity(ingredient, multiplier)
    }));
    
    // Premium features: Map specific products to general ingredients
    const mappedItems = mapToInstacartProducts(formattedItems);
    
    // Create Instacart cart URL with parameters
    const instacartUrl = createInstacartUrl(mappedItems);
    
    // Open Instacart in a new tab
    chrome.tabs.create({ url: instacartUrl });
    
    // Save recent Instacart items for history
    saveRecentInstacartItems(mappedItems);
    
    return { 
      success: true, 
      itemCount: mappedItems.length, 
      url: instacartUrl 
    };
  } catch (error) {
    console.error('Error adding to Instacart:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Map generic ingredients to specific Instacart products (Premium feature)
 * @param {Array} items - Formatted ingredient items
 * @returns {Array} Mapped ingredients with specific product IDs where available
 */
function mapToInstacartProducts(items) {
  // This would typically use a database of product mappings
  // For now, we'll implement a simplified version with common ingredients
  
  const productMappings = {
    'flour': 'all-purpose-flour',
    'sugar': 'granulated-sugar',
    'butter': 'unsalted-butter',
    'eggs': 'large-eggs',
    'milk': 'whole-milk',
    'salt': 'table-salt',
    'pepper': 'black-pepper',
    'olive oil': 'extra-virgin-olive-oil',
    'chocolate chips': 'semi-sweet-chocolate-chips',
    'vanilla extract': 'pure-vanilla-extract',
    'baking soda': 'baking-soda',
    'baking powder': 'baking-powder'
  };
  
  return items.map(item => {
    const lowerQuery = item.query.toLowerCase();
    
    // Look for exact matches in our mapping
    for (const [key, value] of Object.entries(productMappings)) {
      if (lowerQuery === key || lowerQuery.includes(key)) {
        return {
          ...item,
          productId: value,
          mapped: true
        };
      }
    }
    
    // No mapping found, return as is
    return item;
  });
}

/**
 * Create Instacart URL with search parameters
 * @param {Array} items - Formatted and mapped ingredient items
 * @returns {string} Instacart URL with parameters
 */
function createInstacartUrl(items) {
  // Base Instacart URL
  let url = 'https://www.instacart.com/store/';
  
  // For direct add-to-cart, typically you'd need to use Instacart's API
  // Since we don't have direct API access, we'll create a search URL instead
  
  // If we have just one item, search for it directly
  if (items.length === 1) {
    const encodedQuery = encodeURIComponent(items[0].query);
    return `${url}search_v3/${encodedQuery}`;
  }
  
  // For multiple items, go to the main store page
  // In a real implementation with API access, we would add all items to cart
  return url;
}

/**
 * Save recent Instacart items for history tracking
 * @param {Array} items - Ingredients added to Instacart
 */
function saveRecentInstacartItems(items) {
  chrome.storage.local.get(['recentInstacartItems'], result => {
    let recentItems = result.recentInstacartItems || [];
    
    // Add current timestamp
    const currentItems = {
      timestamp: Date.now(),
      items: items
    };
    
    // Add to the beginning of the array
    recentItems.unshift(currentItems);
    
    // Keep only the 10 most recent item sets
    if (recentItems.length > 10) {
      recentItems = recentItems.slice(0, 10);
    }
    
    // Save back to storage
    chrome.storage.local.set({ recentInstacartItems: recentItems });
  });
}