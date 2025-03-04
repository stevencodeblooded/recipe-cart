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

  // Try extraction methods in order of specificity
  
  // 1. Try Schema.org structured data (most reliable when available)
  const schemaIngredients = extractSchemaOrgIngredients();
  if (schemaIngredients.length > 0) {
    console.log('Found Schema.org ingredients:', schemaIngredients.length);
    recipeData.ingredients = schemaIngredients;
    recipeData.format = 'schema';
    return recipeData;
  }
  
  // 2. Try common recipe plugins (WordPress Recipe Maker, Tasty Recipes, etc.)
  const pluginIngredients = extractRecipePluginIngredients();
  if (pluginIngredients.length > 0) {
    console.log('Found recipe plugin ingredients:', pluginIngredients.length);
    recipeData.ingredients = pluginIngredients;
    recipeData.format = 'plugin';
    return recipeData;
  }
  
  // 3. Try common HTML patterns for ingredients
  const patternIngredients = extractCommonPatternIngredients();
  if (patternIngredients.length > 0) {
    console.log('Found pattern-matched ingredients:', patternIngredients.length);
    recipeData.ingredients = patternIngredients;
    recipeData.format = 'pattern';
    return recipeData;
  }
  
  // 4. Fallback to generic extraction
  const genericIngredients = extractGenericIngredients();
  console.log('Found generic ingredients:', genericIngredients.length);
  recipeData.ingredients = genericIngredients;
  recipeData.format = 'generic';
  
  return recipeData;
}

/**
 * Extract recipe title from the page
 */
function extractRecipeTitle() {
  // Try different methods to find the recipe title
  
  // 1. Schema.org metadata
  const schemaTitle = document.querySelector('[itemtype*="schema.org/Recipe"] [itemprop="name"]');
  if (schemaTitle && schemaTitle.textContent.trim()) {
    return schemaTitle.textContent.trim();
  }
  
  // 2. Try common recipe plugin title elements
  const pluginSelectors = [
    '.wprm-recipe-name',                // WordPress Recipe Maker
    '.tasty-recipes-title',             // Tasty Recipes
    '.recipe-title',                    // Common class
    '.mv-create-title',                 // MediaVine
    '.entry-title',                     // Common blog title
    '.recipe-card-title',               // Various plugins
    '.rll-recipe-name',                 // Recipe Card Blocks
    'h1.title',                         // Common pattern
    '.recipe-header h1',                // Common pattern
    '.recipe-summary h1'                // Common pattern
  ];
  
  for (const selector of pluginSelectors) {
    const titleEl = document.querySelector(selector);
    if (titleEl && titleEl.textContent.trim()) {
      return titleEl.textContent.trim();
    }
  }
  
  // 3. Look for a heading near the word "ingredients"
  const ingredientsHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(h => 
    h.textContent.toLowerCase().includes('ingredients') || 
    h.textContent.toLowerCase().includes('recipe')
  );
  
  if (ingredientsHeadings.length > 0) {
    // Find the nearest heading above that could be the title
    const potentialTitles = Array.from(document.querySelectorAll('h1, h2, h3'))
      .filter(h => !h.textContent.toLowerCase().includes('ingredients'));
      
    if (potentialTitles.length > 0) {
      return potentialTitles[0].textContent.trim();
    }
  }
  
  // 4. Fallback to the page's H1 or title
  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent.trim()) {
    return h1.textContent.trim();
  }
  
  return document.title;
}

/**
 * Extract ingredients from Schema.org metadata
 */
function extractSchemaOrgIngredients() {
  const ingredients = [];
  
  try {
    // Method 1: Look for explicit recipe ingredients
    const schemaIngredients = document.querySelectorAll('[itemtype*="schema.org/Recipe"] [itemprop="recipeIngredient"], [itemprop="ingredients"]');
    
    if (schemaIngredients.length > 0) {
      schemaIngredients.forEach(item => {
        if (item.textContent.trim()) {
          const parsed = parseIngredientText(item.textContent.trim());
          ingredients.push(parsed);
        }
      });
      return ingredients;
    }
    
    // Method 2: Look for JSON-LD structured data
    const scriptElements = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scriptElements) {
      try {
        const jsonData = JSON.parse(script.textContent);
        
        // Handle nested @graph structure
        const recipes = [];
        if (jsonData['@graph']) {
          jsonData['@graph'].forEach(item => {
            if (item['@type'] === 'Recipe') recipes.push(item);
          });
        }
        
        // Handle direct recipe
        if (jsonData['@type'] === 'Recipe') recipes.push(jsonData);
        
        // Process found recipes
        for (const recipe of recipes) {
          if (recipe.recipeIngredient && Array.isArray(recipe.recipeIngredient)) {
            recipe.recipeIngredient.forEach(ingredient => {
              ingredients.push(parseIngredientText(ingredient));
            });
            return ingredients;
          }
        }
      } catch (e) {
        console.log('Error parsing JSON-LD:', e);
      }
    }
  } catch (e) {
    console.log('Error extracting schema.org ingredients:', e);
  }
  
  return ingredients;
}

/**
 * Extract ingredients from common recipe plugins
 */
function extractRecipePluginIngredients() {
  const ingredients = [];
  
  // Try different selector patterns for popular recipe plugins
  const pluginSelectors = [
    // WordPress Recipe Maker
    '.wprm-recipe-ingredient',
    
    // Tasty Recipes
    '.tasty-recipes-ingredients li',
    
    // MediaVine Create
    '.mv-create-ingredients li',
    
    // Recipe Card Blocks
    '.rll-ingredients-list li',
    
    // WP Recipe Maker
    '.wpurp-recipe-ingredients li',
    
    // Delicious Recipes
    '.dr-ingredients-list li',
    
    // Cooked Plugin
    '.cooked-ingredient'
  ];
  
  // Try each selector
  for (const selector of pluginSelectors) {
    const elements = document.querySelectorAll(selector);
    
    if (elements.length > 0) {
      console.log(`Found ingredients using selector: ${selector}`);
      
      elements.forEach(item => {
        // Try to extract structured data first
        const amountEl = item.querySelector(
          '.wprm-recipe-ingredient-amount, ' +
          '.ingredient-amount, ' +
          '.amount, ' +
          '.qty'
        );
        
        const unitEl = item.querySelector(
          '.wprm-recipe-ingredient-unit, ' +
          '.ingredient-unit, ' +
          '.unit'
        );
        
        const nameEl = item.querySelector(
          '.wprm-recipe-ingredient-name, ' +
          '.ingredient-name, ' +
          '.name'
        );
        
        const notesEl = item.querySelector(
          '.wprm-recipe-ingredient-notes, ' +
          '.ingredient-notes, ' +
          '.notes'
        );
        
        if ((amountEl || unitEl || nameEl) && !item.querySelector('ul, ol')) {
          // Use structured data if available
          const ingredient = {
            amount: amountEl ? amountEl.textContent.trim() : '',
            unit: unitEl ? unitEl.textContent.trim() : '',
            name: nameEl ? nameEl.textContent.trim() : '',
            notes: notesEl ? notesEl.textContent.trim() : '',
            original: item.textContent.trim(),
            originalAmount: amountEl ? amountEl.textContent.trim() : '',
            originalUnit: unitEl ? unitEl.textContent.trim() : ''
          };
          
          // If name is empty but we have text content, use parsed text
          if (!ingredient.name && item.textContent.trim()) {
            const parsed = parseIngredientText(item.textContent.trim());
            ingredient.amount = ingredient.amount || parsed.amount;
            ingredient.unit = ingredient.unit || parsed.unit;
            ingredient.name = ingredient.name || parsed.name;
            ingredient.notes = ingredient.notes || parsed.notes;
          }
          
          if (ingredient.name || ingredient.original) {
            ingredients.push(ingredient);
          }
        } else if (item.textContent.trim()) {
          // Parse whole text if structured elements not found
          const parsed = parseIngredientText(item.textContent.trim());
          ingredients.push(parsed);
        }
      });
      
      // If we found ingredients, return them
      if (ingredients.length > 0) {
        return ingredients;
      }
    }
  }
  
  return ingredients;
}

/**
 * Extract ingredients based on common HTML patterns
 */
function extractCommonPatternIngredients() {
  const ingredients = [];
  
  try {
    // Look for likely ingredient sections
    const potentialSections = [];
    
    // Method 1: Find sections by headings
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const heading of headings) {
      const text = heading.textContent.toLowerCase();
      if (text.includes('ingredient') || text === 'ingredients') {
        // Find the next list or div after this heading
        let nextEl = heading.nextElementSibling;
        while (nextEl && !nextEl.matches('h1, h2, h3, h4, h5, h6')) {
          if (nextEl.matches('ul, ol, div')) {
            potentialSections.push(nextEl);
            break;
          }
          nextEl = nextEl.nextElementSibling;
        }
      }
    }
    
    // Method 2: Find likely sections by class/id names
    const sectionSelectors = [
      '[class*="ingredient" i]:not(li)',
      '[id*="ingredient" i]',
      '.recipe-ingredients',
      '.ingredients-section',
      '.recipe__ingredients',
      '.recipe-ingred',
      '.entry-ingredients'
    ];
    
    for (const selector of sectionSelectors) {
      const sections = document.querySelectorAll(selector);
      sections.forEach(section => potentialSections.push(section));
    }
    
    // Process each potential section
    for (const section of potentialSections) {
      // Find lists within the section
      const lists = section.querySelectorAll('ul, ol');
      
      if (lists.length > 0) {
        // Process items from all lists
        for (const list of lists) {
          const items = list.querySelectorAll('li');
          for (const item of items) {
            if (item.textContent.trim() && !item.querySelector('ul, ol')) {
              // Check if this looks like an ingredient (contains measurements or food items)
              const text = item.textContent.toLowerCase();
              if (isMeasurementOrFood(text)) {
                const parsed = parseIngredientText(item.textContent.trim());
                ingredients.push(parsed);
              }
            }
          }
        }
      } else {
        // No lists found, try to find ingredient-like paragraphs or divs
        const paragraphs = section.querySelectorAll('p, div');
        for (const p of paragraphs) {
          if (p.textContent.trim() && !p.querySelector('p, div, ul, ol, h1, h2, h3, h4, h5, h6')) {
            const text = p.textContent.toLowerCase();
            if (isMeasurementOrFood(text)) {
              const parsed = parseIngredientText(p.textContent.trim());
              ingredients.push(parsed);
            }
          }
        }
      }
      
      // If we found ingredients in this section, return them
      if (ingredients.length > 0) {
        return ingredients;
      }
    }
  } catch (e) {
    console.log('Error in pattern extraction:', e);
  }
  
  return ingredients;
}

/**
 * Check if text contains measurements or common food words
 */
function isMeasurementOrFood(text) {
  const measurementTerms = [
    'cup', 'tbsp', 'tsp', 'tablespoon', 'teaspoon', 'ounce', 'oz', 'pound', 'lb',
    'gram', 'g', 'kg', 'ml', 'liter', 'l', 'pinch', 'dash', 'handful', 'slice'
  ];
  
  const commonIngredients = [
    'salt', 'pepper', 'sugar', 'flour', 'butter', 'oil', 'egg', 'milk', 'water',
    'onion', 'garlic', 'chicken', 'beef', 'rice', 'pasta', 'cheese', 'tomato'
  ];
  
  // Check for common measurement patterns
  if (/\d+(\.\d+)?/.test(text)) {
    return true;
  }
  
  // Check for measurement terms
  for (const term of measurementTerms) {
    if (text.includes(term)) {
      return true;
    }
  }
  
  // Check for common ingredients
  for (const ingredient of commonIngredients) {
    if (text.includes(ingredient)) {
      return true;
    }
  }
  
  // Check for fractions
  if (/\d+\/\d+/.test(text) || /[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/.test(text)) {
    return true;
  }
  
  return false;
}

/**
 * Generic ingredient extraction for sites without structured data
 */
function extractGenericIngredients() {
  const ingredients = [];
  
  try {
    // Find all lists in the document
    const lists = document.querySelectorAll('ul, ol');
    const ingredientLists = [];
    
    // Score each list based on how likely it is to be an ingredients list
    for (const list of lists) {
      const items = list.querySelectorAll('li');
      if (items.length < 2) continue; // Too short to be an ingredients list
      
      let score = 0;
      let itemsWithMeasurements = 0;
      let itemsWithFood = 0;
      
      // Check all items
      for (const item of items) {
        const text = item.textContent.toLowerCase();
        // Check for measurements
        if (/\d+(\.\d+)?/.test(text) || /\d+\/\d+/.test(text) || /[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/.test(text)) {
          itemsWithMeasurements++;
        }
        
        // Check for common ingredients
        if (containsCommonFoodWords(text)) {
          itemsWithFood++;
        }
      }
      
      // Calculate score
      score += (itemsWithMeasurements / items.length) * 10;
      score += (itemsWithFood / items.length) * 5;
      
      // Bonus for lists near the word "ingredient"
      const listText = list.parentElement.textContent.toLowerCase();
      if (listText.includes('ingredient')) {
        score += 5;
      }
      
      // Penalize lists with long items (likely instructions, not ingredients)
      const avgLength = Array.from(items).reduce((sum, item) => sum + item.textContent.length, 0) / items.length;
      if (avgLength > 100) {
        score -= 5;
      }
      
      ingredientLists.push({list, score, items: items.length});
    }
    
    // Sort lists by score
    ingredientLists.sort((a, b) => b.score - a.score);
    
    // Use the top-scoring list
    if (ingredientLists.length > 0 && ingredientLists[0].score > 3) {
      const bestList = ingredientLists[0].list;
      const items = bestList.querySelectorAll('li');
      
      for (const item of items) {
        const text = item.textContent.trim();
        if (text && !item.querySelector('ul, ol') && isMeasurementOrFood(text.toLowerCase())) {
          const parsed = parseIngredientText(text);
          ingredients.push(parsed);
        }
      }
    }
    
    // If no good lists found, look for likely ingredient paragraphs
    if (ingredients.length === 0) {
      const paragraphs = document.querySelectorAll('p');
      for (const p of paragraphs) {
        const text = p.textContent.trim().toLowerCase();
        if (text.length > 10 && text.length < 100 && isMeasurementOrFood(text)) {
          // Split by line breaks or bullet points
          const lines = text.split(/[\n\r•]+/).filter(line => line.trim().length > 0);
          for (const line of lines) {
            if (isMeasurementOrFood(line)) {
              const parsed = parseIngredientText(line.trim());
              ingredients.push(parsed);
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('Error in generic extraction:', e);
  }
  
  return ingredients;
}

/**
 * Check if text contains common food words
 */
function containsCommonFoodWords(text) {
  const commonFoods = [
    'flour', 'sugar', 'salt', 'pepper', 'butter', 'oil', 'eggs', 'milk',
    'water', 'chicken', 'beef', 'pork', 'onion', 'garlic', 'tomato',
    'cheese', 'bread', 'rice', 'pasta', 'potato', 'carrot', 'celery',
    'sauce', 'cream', 'yogurt', 'chocolate', 'vanilla', 'cinnamon',
    'spice', 'herb', 'vegetable', 'fruit', 'meat', 'fish', 'wine',
    'broth', 'stock', 'vinegar', 'honey', 'maple', 'syrup', 'baking',
    'powder', 'soda', 'yeast', 'nuts', 'beans', 'lentil', 'grain'
  ];
  
  for (const food of commonFoods) {
    if (text.includes(food)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Helper function to parse unstructured ingredient text
 */
function parseIngredientText(text) {
  // Basic parsing logic for "2 cups flour" format
  const amount = parseIngredientAmount(text);
  let remainingText = text.replace(amount.originalText, '').trim();
  
  // Parse the unit
  const unit = parseIngredientUnit(remainingText);
  remainingText = remainingText.replace(unit.originalText, '').trim();
  
  // Check for notes in parentheses
  let notes = '';
  const notesMatch = remainingText.match(/\(([^)]+)\)/);
  if (notesMatch) {
    notes = notesMatch[1].trim();
    remainingText = remainingText.replace(notesMatch[0], '').trim();
  }
  
  // The rest is the ingredient name
  const name = remainingText.trim();
  
  return {
    amount: amount.value,
    unit: unit.value,
    name: name,
    notes: notes,
    original: text
  };
}

/**
 * Parse the amount from ingredient text
 */
function parseIngredientAmount(text) {
  // Regular expressions for different formats
  const regexes = [
    // Fractions with whole numbers: 1 1/2, 2 1/4, etc.
    { regex: /^(\d+)\s+(\d+\/\d+)/, process: (match) => parseFloat(match[1]) + parseFloat(match[2].split('/')[0]) / parseFloat(match[2].split('/')[1]) },
    
    // Simple fractions: 1/2, 3/4, etc.
    { regex: /^(\d+)\/(\d+)/, process: (match) => parseFloat(match[1]) / parseFloat(match[2]) },
    
    // Decimal numbers: 1.5, 0.75, etc.
    { regex: /^(\d+\.\d+)/, process: (match) => parseFloat(match[1]) },
    
    // Whole numbers: 1, 2, 3, etc.
    { regex: /^(\d+)/, process: (match) => parseInt(match[1], 10) },
    
    // Unicode fractions: ½, ¼, etc.
    { 
      regex: /^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/, 
      process: (match) => {
        const fractionMap = {
          '½': 0.5, '⅓': 1/3, '⅔': 2/3, '¼': 0.25, '¾': 0.75,
          '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
          '⅙': 1/6, '⅚': 5/6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
        };
        return fractionMap[match[1]] || 0;
      }
    },
    
    // Whole number with unicode fraction: 1½, 2¼, etc.
    {
      regex: /^(\d+)([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/, 
      process: (match) => {
        const fractionMap = {
          '½': 0.5, '⅓': 1/3, '⅔': 2/3, '¼': 0.25, '¾': 0.75,
          '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
          '⅙': 1/6, '⅚': 5/6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
        };
        return parseInt(match[1], 10) + (fractionMap[match[2]] || 0);
      }
    },
    
    // Range: 1-2, 2-3, etc. (take average)
    { regex: /^(\d+)\s*-\s*(\d+)/, process: (match) => (parseInt(match[1], 10) + parseInt(match[2], 10)) / 2 }
  ];
  
  // Test each regex
  for (const {regex, process} of regexes) {
    const match = text.match(regex);
    if (match) {
      return {
        value: String(process(match)),
        originalText: match[0]
      };
    }
  }
  
  // No amount found
  return {
    value: '',
    originalText: ''
  };
}

/**
 * Parse the unit from ingredient text
 */
function parseIngredientUnit(text) {
  // Common units and their variations
  const units = [
    { name: 'cup', variations: ['cups', 'cup', 'c.', 'c'] },
    { name: 'tablespoon', variations: ['tablespoons', 'tablespoon', 'tbsp', 'tbsp.', 'tbs', 'tbs.', 'T', 'T.'] },
    { name: 'teaspoon', variations: ['teaspoons', 'teaspoon', 'tsp', 'tsp.', 't', 't.'] },
    { name: 'fluid ounce', variations: ['fluid ounces', 'fluid ounce', 'fl oz', 'fl. oz.', 'oz. fl.'] },
    { name: 'ounce', variations: ['ounces', 'ounce', 'oz', 'oz.'] },
    { name: 'pound', variations: ['pounds', 'pound', 'lb', 'lb.', 'lbs', 'lbs.'] },
    { name: 'gram', variations: ['grams', 'gram', 'g', 'g.'] },
    { name: 'kilogram', variations: ['kilograms', 'kilogram', 'kg', 'kg.'] },
    { name: 'milliliter', variations: ['milliliters', 'milliliter', 'ml', 'ml.'] },
    { name: 'liter', variations: ['liters', 'liter', 'l', 'l.'] },
    { name: 'pinch', variations: ['pinches', 'pinch'] },
    { name: 'dash', variations: ['dashes', 'dash'] },
    { name: 'clove', variations: ['cloves', 'clove'] },
    { name: 'bunch', variations: ['bunches', 'bunch'] },
    { name: 'slice', variations: ['slices', 'slice'] },
    { name: 'piece', variations: ['pieces', 'piece'] },
    { name: 'can', variations: ['cans', 'can'] },
    { name: 'jar', variations: ['jars', 'jar'] },
    { name: 'head', variations: ['heads', 'head'] },
    { name: 'stalk', variations: ['stalks', 'stalk'] },
    { name: 'sprig', variations: ['sprigs', 'sprig'] }
  ];
  
  const cleanText = text.trim().toLowerCase();
  
  // Check each unit and its variations
  for (const unit of units) {
    for (const variation of unit.variations) {
      // Check for unit at start of string, followed by space or end of string
      const regex = new RegExp(`^${variation}(\\s|$)`);
      if (regex.test(cleanText)) {
        const match = cleanText.match(regex);
        return {
          value: variation,
          originalText: match[0].trim()
        };
      }
    }
  }
  
  // No unit found
  return {
    value: '',
    originalText: ''
  };
}

/**
 * Detect the measurement system being used (US customary or metric)
 */
function detectMeasurementSystem() {
  try {
    // Look for measurement system toggles
    const metricButton = document.querySelector('[data-system="2"], [data-unit-system="metric"]');
    const usButton = document.querySelector('[data-system="1"], [data-unit-system="us"]');
    
    // Check which one is active
    if (metricButton && (metricButton.classList.contains('active') || metricButton.getAttribute('aria-selected') === 'true')) {
      return 'metric';
    }
    
    if (usButton && (usButton.classList.contains('active') || usButton.getAttribute('aria-selected') === 'true')) {
      return 'us';
    }
    
    // Try to infer from the content
    const allText = document.body.textContent.toLowerCase();
    
    // Count metric vs US terms
    const metricUnits = ['gram', 'grams', 'g', 'kg', 'ml', 'l', 'liter', 'litre', 'milliliter', 'millilitre', 'cm'];
    const usUnits = ['cup', 'cups', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons', 'oz', 'pound', 'lb', 'inch', 'quart'];
    
    let metricCount = 0;
    let usCount = 0;
    
    for (const unit of metricUnits) {
      const regex = new RegExp(`\\b${unit}\\b`, 'g');
      const matches = allText.match(regex);
      if (matches) {
        metricCount += matches.length;
      }
    }
    
    for (const unit of usUnits) {
      const regex = new RegExp(`\\b${unit}\\b`, 'g');
      const matches = allText.match(regex);
      if (matches) {
        usCount += matches.length;
      }
    }
    
    return metricCount > usCount ? 'metric' : 'us';
  } catch (e) {
    console.log('Error detecting measurement system:', e);
    return 'us'; // Default to US
  }
}

/**
 * Detect the recipe multiplier (1x, 2x, 3x)
 */
function detectMultiplier() {
  try {
    // Look for multiplier buttons
    const buttons = document.querySelectorAll('[data-multiplier], [data-servings-multiplier]');
    
    for (const button of buttons) {
      if (button.classList.contains('active') || button.getAttribute('aria-selected') === 'true') {
        const multiplier = button.getAttribute('data-multiplier') || button.getAttribute('data-servings-multiplier');
        if (multiplier) {
          return parseInt(multiplier, 10);
        }
      }
    }
    
    // Look for buttons with text like "1x", "2x", etc.
    const multiplierButtons = Array.from(document.querySelectorAll('button')).filter(b => 
      /^[1-9]x$/i.test(b.textContent.trim())
    );
    
    for (const button of multiplierButtons) {
      if (button.classList.contains('active') || button.getAttribute('aria-selected') === 'true') {
        const multiplier = parseInt(button.textContent.trim().replace('x', ''), 10);
        if (!isNaN(multiplier)) {
          return multiplier;
        }
      }
    }
    
    // Check for active spans or divs with multiplier text
    const multiplierElements = Array.from(document.querySelectorAll('span, div')).filter(el => 
      /^[1-9]x$/i.test(el.textContent.trim())
    );
    
    for (const element of multiplierElements) {
      if (element.classList.contains('active') || element.classList.contains('selected')) {
        const multiplier = parseInt(element.textContent.trim().replace('x', ''), 10);
        if (!isNaN(multiplier)) {
          return multiplier;
        }
      }
    }
    
    // Default to 1x
    return 1;
  } catch (e) {
    console.log('Error detecting multiplier:', e);
    return 1; // Default to 1x
  }
}

// Initialize - Log that the content script has loaded
console.log('RecipeCart content script loaded and ready');