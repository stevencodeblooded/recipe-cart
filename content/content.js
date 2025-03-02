/**
 * RecipeCart - Content Script
 * Extracts recipe ingredients from recipe websites
 */

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractIngredients') {
    console.log('Received extraction request');
    const result = extractRecipeIngredients();
    console.log('Extraction result:', result);
    sendResponse({ success: result.ingredients.length > 0, ingredients: result });
  }
  return true; // Required for async response
});

/**
 * Main function to extract recipe ingredients from the current page
 */
function extractRecipeIngredients() {
  console.log('Starting extraction process');
  
  // Recipe data to be returned
  const recipeData = {
    title: extractRecipeTitle(),
    ingredients: [],
    url: window.location.href,
    measurementSystem: detectMeasurementSystem(),
    multiplier: detectMultiplier()
  };

  console.log('Extracted title:', recipeData.title);
  console.log('Detected measurement system:', recipeData.measurementSystem);
  console.log('Detected multiplier:', recipeData.multiplier);

  // For joyfoodsunshine.com specifically
  if (window.location.hostname.includes('joyfoodsunshine')) {
    console.log('Detected joyfoodsunshine.com');
    const joyfoodIngredients = extractJoyfoodIngredients();
    if (joyfoodIngredients.length > 0) {
      console.log('Found joyfoodsunshine ingredients:', joyfoodIngredients.length);
      recipeData.ingredients = joyfoodIngredients;
      recipeData.format = 'joyfood';
      return recipeData;
    }
  }
  
  // Try WordPress Recipe Maker (WPRM) format (common for many food blogs)
  const wprmIngredients = extractWPRMIngredients();
  if (wprmIngredients.length > 0) {
    console.log('Found WPRM ingredients:', wprmIngredients.length);
    recipeData.ingredients = wprmIngredients;
    recipeData.format = 'wprm';
    return recipeData;
  }
  
  // Try other common recipe formats
  const schemaIngredients = extractSchemaOrgIngredients();
  if (schemaIngredients.length > 0) {
    console.log('Found Schema.org ingredients:', schemaIngredients.length);
    recipeData.ingredients = schemaIngredients;
    recipeData.format = 'schema';
    return recipeData;
  }
  
  // Fallback to generic extraction if specific formats aren't detected
  const genericIngredients = extractGenericIngredients();
  console.log('Found generic ingredients:', genericIngredients.length);
  recipeData.ingredients = genericIngredients;
  recipeData.format = 'generic';
  
  return recipeData;
}

/**
 * Extract ingredients specifically from joyfoodsunshine.com
 */
function extractJoyfoodIngredients() {
  const ingredients = [];
  
  // Try different selectors used on joyfoodsunshine.com
  const ingredientElements = document.querySelectorAll('.wprm-recipe-ingredient, li.wprm-recipe-ingredient');
  
  console.log('JoyFood ingredient elements found:', ingredientElements.length);
  
  if (ingredientElements.length === 0) {
    // Try a more generic approach for this site
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    console.log('Found checkboxes:', allCheckboxes.length);
    
    // Look for parent elements that might contain ingredients
    for (const checkbox of allCheckboxes) {
      const parentLi = checkbox.closest('li');
      if (parentLi && parentLi.textContent.trim()) {
        const text = parentLi.textContent.trim();
        const parsed = parseIngredientText(text);
        ingredients.push(parsed);
        console.log('Parsed ingredient from checkbox:', parsed);
      }
    }
    
    return ingredients;
  }
  
  // Parse each ingredient
  ingredientElements.forEach(item => {
    // Try different element structures
    const amountEl = item.querySelector('.wprm-recipe-ingredient-amount');
    const unitEl = item.querySelector('.wprm-recipe-ingredient-unit');
    const nameEl = item.querySelector('.wprm-recipe-ingredient-name');
    const notesEl = item.querySelector('.wprm-recipe-ingredient-notes');
    
    if (amountEl || unitEl || nameEl) {
      const ingredient = {
        amount: amountEl ? amountEl.textContent.trim() : '',
        unit: unitEl ? unitEl.textContent.trim() : '',
        name: nameEl ? nameEl.textContent.trim() : '',
        notes: notesEl ? notesEl.textContent.trim() : '',
        original: item.textContent.trim()
      };
      
      ingredients.push(ingredient);
      console.log('Parsed structured ingredient:', ingredient);
    } else {
      // If we can't find the structured elements, parse the whole text
      const text = item.textContent.trim();
      const parsed = parseIngredientText(text);
      ingredients.push(parsed);
      console.log('Parsed text ingredient:', parsed);
    }
  });
  
  return ingredients;
}

/**
 * Extract recipe title from the page
 */
function extractRecipeTitle() {
  // Try site-specific selectors
  if (window.location.hostname.includes('joyfoodsunshine')) {
    const titleEl = document.querySelector('h1.entry-title, .wprm-recipe-name');
    if (titleEl && titleEl.textContent.trim()) {
      return titleEl.textContent.trim();
    }
  }
  
  // Try WPRM title
  const wprmTitle = document.querySelector('.wprm-recipe-name');
  if (wprmTitle && wprmTitle.textContent.trim()) {
    return wprmTitle.textContent.trim();
  }
  
  // Try schema.org metadata
  const schemaTitle = document.querySelector('[itemtype*="schema.org/Recipe"] [itemprop="name"]');
  if (schemaTitle && schemaTitle.textContent.trim()) {
    return schemaTitle.textContent.trim();
  }
  
  // Fallback to page title
  const h1Title = document.querySelector('h1');
  if (h1Title && h1Title.textContent.trim()) {
    return h1Title.textContent.trim();
  }
  
  return document.title;
}

/**
 * Extract ingredients from WordPress Recipe Maker format
 */
function extractWPRMIngredients() {
  const ingredients = [];
  
  // Find WPRM ingredient containers (try various selectors)
  const ingredientItems = document.querySelectorAll('.wprm-recipe-ingredient, li.wprm-recipe-ingredient');
  
  console.log('WPRM ingredient elements found:', ingredientItems.length);
  
  if (ingredientItems.length === 0) {
    return ingredients;
  }
  
  // Parse each ingredient
  ingredientItems.forEach(item => {
    const amountEl = item.querySelector('.wprm-recipe-ingredient-amount');
    const unitEl = item.querySelector('.wprm-recipe-ingredient-unit');
    const nameEl = item.querySelector('.wprm-recipe-ingredient-name');
    const notesEl = item.querySelector('.wprm-recipe-ingredient-notes');
    
    if (amountEl || unitEl || nameEl) {
      const ingredient = {
        amount: amountEl ? amountEl.textContent.trim() : '',
        unit: unitEl ? unitEl.textContent.trim() : '',
        name: nameEl ? nameEl.textContent.trim() : '',
        notes: notesEl ? notesEl.textContent.trim() : '',
        original: item.textContent.trim()
      };
      
      ingredients.push(ingredient);
    } else {
      // If structured elements not found, use the text content
      const text = item.textContent.trim();
      if (text) {
        const parsed = parseIngredientText(text);
        ingredients.push(parsed);
      }
    }
  });
  
  return ingredients;
}

/**
 * Extract ingredients from Schema.org metadata
 */
function extractSchemaOrgIngredients() {
  const ingredients = [];
  
  // Look for schema.org recipe ingredients
  const schemaIngredients = document.querySelectorAll('[itemtype*="schema.org/Recipe"] [itemprop="recipeIngredient"], [itemprop="ingredients"]');
  
  console.log('Schema.org ingredient elements found:', schemaIngredients.length);
  
  if (schemaIngredients.length === 0) {
    return ingredients;
  }
  
  // Parse each schema ingredient
  schemaIngredients.forEach(item => {
    // Try to break down the ingredient text
    const text = item.textContent.trim();
    if (text) {
      const parsed = parseIngredientText(text);
      ingredients.push(parsed);
    }
  });
  
  return ingredients;
}

/**
 * Generic ingredient extraction for sites without structured data
 */
function extractGenericIngredients() {
  const ingredients = [];
  
  // Look for lists inside sections that might contain ingredients
  const allLists = Array.from(document.querySelectorAll('ul, ol'));
  console.log('All list elements found:', allLists.length);
  
  // Filter lists that look like ingredient lists
  const potentialLists = allLists.filter(list => {
    const text = list.textContent.toLowerCase();
    return text.includes('cup') || 
           text.includes('teaspoon') ||
           text.includes('tablespoon') ||
           text.includes('ounce') ||
           text.includes('gram');
  });
  
  console.log('Potential ingredient lists found:', potentialLists.length);
  
  if (potentialLists.length === 0) {
    // If we can't find an obvious ingredient list, look for structured content
    const checkboxItems = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxItems.length > 5) {  // Probably a recipe if there are several checkboxes
      for (const checkbox of checkboxItems) {
        const parentEl = checkbox.closest('li');
        if (parentEl && parentEl.textContent.trim()) {
          const text = parentEl.textContent.trim();
          const parsed = parseIngredientText(text);
          ingredients.push(parsed);
        }
      }
      return ingredients;
    }
    return ingredients;
  }
  
  // Use the most likely ingredient list (typically the one with the most items)
  const bestList = potentialLists.reduce((best, current) => 
    current.children.length > best.children.length ? current : best, potentialLists[0]);
  
  // Parse items from the best list
  Array.from(bestList.children).forEach(item => {
    const text = item.textContent.trim();
    if (text) {
      const parsed = parseIngredientText(text);
      ingredients.push(parsed);
    }
  });
  
  return ingredients;
}

/**
 * Helper function to parse unstructured ingredient text
 */
function parseIngredientText(text) {
  // Basic parsing logic for "2 cups flour" format
  const amountRegex = /^([\d\/\.\s]+)/;
  const unitRegex = /(cup|cups|teaspoon|teaspoons|tablespoon|tablespoons|tsp|tbsp|oz|ounce|ounces|pound|pounds|lb|lbs|gram|grams|g|kg|ml|liter|liters|l)\s+/i;
  
  const amountMatch = text.match(amountRegex);
  let remainingText = text;
  let amount = '';
  
  if (amountMatch) {
    amount = amountMatch[1].trim();
    remainingText = text.substring(amountMatch[0].length).trim();
  }
  
  const unitMatch = remainingText.match(unitRegex);
  let unit = '';
  let name = remainingText;
  let notes = '';
  
  if (unitMatch) {
    unit = unitMatch[1].trim();
    name = remainingText.substring(unitMatch[0].length).trim();
  }
  
  // Check for notes in parentheses
  const notesMatch = name.match(/\((.*?)\)/);
  if (notesMatch) {
    notes = notesMatch[1].trim();
    name = name.replace(notesMatch[0], '').trim();
  }
  
  return {
    amount,
    unit,
    name,
    notes,
    original: text
  };
}

/**
 * Detect the measurement system being used (US customary or metric)
 */
function detectMeasurementSystem() {
  // Look for measurement system toggles (without using :contains)
  const metricButton = document.querySelector('.wprm-unit-conversion[data-system="2"], button[data-system="2"]');
  const usButton = document.querySelector('.wprm-unit-conversion[data-system="1"], button[data-system="1"]');
  
  // Check which one is active (various class names for active state)
  if (metricButton && (metricButton.classList.contains('wprmpuc-active') || metricButton.classList.contains('active'))) {
    return 'metric';
  }
  
  if (usButton && (usButton.classList.contains('wprmpuc-active') || usButton.classList.contains('active'))) {
    return 'us';
  }
  
  // Check for active toggle by looking for UI indicators
  const toggleContainer = document.querySelector('.wprm-unit-conversion-container');
  if (toggleContainer) {
    const activeToggle = toggleContainer.querySelector('.active, .wprmpuc-active');
    if (activeToggle) {
      const toggleText = activeToggle.textContent.toLowerCase();
      if (toggleText.includes('metric')) return 'metric';
      if (toggleText.includes('us')) return 'us';
    }
  }
  
  // Find buttons that might be for unit selection
  const allButtons = document.querySelectorAll('button');
  for (const button of allButtons) {
    const text = button.textContent.toLowerCase();
    if (text === 'metric' && button.classList.contains('active')) {
      return 'metric';
    }
    if ((text === 'us' || text === 'us customary') && button.classList.contains('active')) {
      return 'us';
    }
  }
  
  // Try to infer from ingredients
  const ingredients = document.querySelectorAll('.wprm-recipe-ingredient, li');
  let metricCount = 0;
  let usCount = 0;
  
  ingredients.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (text.includes('gram') || text.includes(' g ') || text.includes('ml') || text.includes('liter')) {
      metricCount++;
    }
    if (text.includes('cup') || text.includes('oz') || text.includes('pound') || text.includes('tablespoon')) {
      usCount++;
    }
  });
  
  if (metricCount > usCount) return 'metric';
  return 'us'; // Default to US units
}

/**
 * Detect the recipe multiplier (1x, 2x, 3x)
 */
function detectMultiplier() {
  // Look for multiplier buttons
  const buttons = document.querySelectorAll('.wprm-recipe-adjustable-servings, [data-multiplier], .wprm-toggle');
  
  for (const button of buttons) {
    if (button.classList.contains('wprm-toggle-active') || button.classList.contains('active')) {
      const multiplier = button.getAttribute('data-multiplier');
      if (multiplier) {
        return parseInt(multiplier, 10);
      }
    }
  }
  
  // Try to infer multiplier from UI
  const allButtons = document.querySelectorAll('button');
  for (const button of allButtons) {
    const text = button.textContent.trim();
    if (text === "1x" && button.classList.contains('active')) return 1;
    if (text === "2x" && button.classList.contains('active')) return 2;
    if (text === "3x" && button.classList.contains('active')) return 3;
  }
  
  return 1; // Default to 1x
}

// Initialize - Log that the content script has loaded
console.log('RecipeCart content script loaded and ready');