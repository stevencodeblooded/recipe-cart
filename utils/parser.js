/**
 * RecipeCart - Parser Utilities
 * Helper functions for parsing and converting recipe data
 */

// Conversion factors for common measurements
const conversionFactors = {
  // Volume conversions
  cup_to_ml: 236.588,
  tablespoon_to_ml: 14.7868,
  teaspoon_to_ml: 4.92892,
  fluidOunce_to_ml: 29.5735,
  
  // Weight conversions
  pound_to_g: 453.592,
  ounce_to_g: 28.3495
};

// Common unit mappings
const unitMappings = {
  // US to metric
  cup: 'ml',
  cups: 'ml',
  tablespoon: 'ml',
  tablespoons: 'ml',
  tbsp: 'ml',
  teaspoon: 'ml',
  teaspoons: 'ml',
  tsp: 'ml',
  'fluid ounce': 'ml',
  'fluid ounces': 'ml',
  'fl oz': 'ml',
  pound: 'g',
  pounds: 'g',
  lb: 'g',
  lbs: 'g',
  ounce: 'g',
  ounces: 'g',
  oz: 'g',
  
  // Metric to US
  ml: 'fluid ounce',
  milliliter: 'fluid ounce',
  milliliters: 'fluid ounce',
  l: 'cup',
  liter: 'cup',
  liters: 'cup',
  g: 'ounce',
  gram: 'ounce',
  grams: 'ounce',
  kg: 'pound',
  kilogram: 'pound',
  kilograms: 'pound'
};

// Common fraction conversions for display
const fractionMap = {
  0.25: '1/4',
  0.33: '1/3',
  0.5: '1/2',
  0.67: '2/3',
  0.75: '3/4',
  0.125: '1/8',
  0.375: '3/8',
  0.625: '5/8',
  0.875: '7/8',
  0.2: '1/5',
  0.4: '2/5',
  0.6: '3/5',
  0.8: '4/5'
};

// Unicode fraction mappings
const unicodeFractions = {
  0.5: '½',
  0.33: '⅓',
  0.67: '⅔',
  0.25: '¼',
  0.75: '¾',
  0.2: '⅕',
  0.4: '⅖',
  0.6: '⅗',
  0.8: '⅘',
  0.17: '⅙',
  0.83: '⅚',
  0.125: '⅛',
  0.375: '⅜',
  0.625: '⅝',
  0.875: '⅞'
};

/**
 * Convert a measurement from one system to another
 * @param {string} amount - The amount to convert
 * @param {string} unit - The unit to convert from
 * @param {string} targetSystem - The system to convert to ('us' or 'metric')
 * @returns {object} The converted amount and unit
 */
export function convertMeasurement(amount, unit, targetSystem) {
  // Parse the amount to a number
  const numericAmount = parseAmount(amount);
  
  if (isNaN(numericAmount)) {
    return { amount, unit }; // Return original if can't convert
  }
  
  // Store original unit format to preserve abbreviations
  const originalFormat = unit;
  
  // Normalize the unit for calculation (lowercase, singular)
  const normalizedUnit = normalizeUnit(unit);
  
  // Determine the current system
  const currentSystem = getUnitSystem(normalizedUnit);
  
  // If already in target system or system can't be determined, return as is
  if (currentSystem === targetSystem || currentSystem === 'unknown') {
    return { amount, unit: originalFormat };
  }
  
  // Convert based on the unit type
  let result;
  if (currentSystem === 'us' && targetSystem === 'metric') {
    result = convertUSToMetric(numericAmount, normalizedUnit);
  } else if (currentSystem === 'metric' && targetSystem === 'us') {
    result = convertMetricToUS(numericAmount, normalizedUnit);
  } else {
    result = { amount: formatAmount(numericAmount), unit: originalFormat };
  }
  
  return result;
}

/**
 * Parse an amount string to a numeric value
 * @param {string} amount - The amount to parse
 * @returns {number} The numeric value
 */
export function parseAmount(amount) {
  // Convert to string if it's not already
  if (amount === null || amount === undefined) return 0;
  
  // Ensure amount is a string
  const amountStr = String(amount);
  
  // Check for range formats
  // e.g., "3 to 3 ½" or "3-4" or "3 - 4"
  const toRangeMatch = amountStr.match(/(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]?)\s+to\s+(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]?)/i);
  const dashRangeMatch = amountStr.match(/(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]?)\s*-\s*(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]?)/);
  
  if (toRangeMatch || dashRangeMatch) {
    const match = toRangeMatch || dashRangeMatch;
    // Process both parts of the range separately
    const minStr = match[1];
    const maxStr = match[2];
    
    // Parse each part as a simple amount
    const minValue = parseSimpleAmount(minStr);
    const maxValue = parseSimpleAmount(maxStr);
    
    // Return a range object
    return {
      isRange: true,
      min: minValue,
      max: maxValue,
      original: amountStr
    };
  }
  
  // Not a range, parse as normal amount
  return parseSimpleAmount(amountStr);
}

/**
 * Parse a simple (non-range) amount string
 * @private
 * @param {string} amountStr - The amount string to parse
 * @returns {number} The numeric value
 */
function parseSimpleAmount(amountStr) {
  // Handle Unicode fraction characters
  let processedAmount = amountStr;
  
  // Look for Unicode fractions in the string
  for (const [fraction, unicode] of Object.entries(unicodeFractions)) {
    if (processedAmount.includes(unicode)) {
      // For mixed numbers like "1½"
      const mixedMatch = processedAmount.match(new RegExp(`(\\d+)${unicode}`));
      if (mixedMatch) {
        return parseInt(mixedMatch[1], 10) + parseFloat(fraction);
      }
      // For just the fraction
      processedAmount = processedAmount.replace(unicode, fraction);
    }
  }
  
  // Handle simple numeric values
  if (!isNaN(parseFloat(processedAmount))) {
    return parseFloat(processedAmount);
  }
  
  // Handle fractions like "1/2"
  const fractionMatch = processedAmount.match(/(\d+)\/(\d+)/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
  }
  
  // Handle mixed numbers like "1 1/2"
  const mixedMatch = processedAmount.match(/(\d+)\s+(\d+)\/(\d+)/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1], 10) + 
           (parseInt(mixedMatch[2], 10) / parseInt(mixedMatch[3], 10));
  }
  
  // Can't parse
  return NaN;
}

/**
 * Format a numeric amount back to a human-readable string
 * @param {number} amount - The numeric amount
 * @param {string} originalFormat - The original format (optional)
 * @returns {string} The formatted amount
 */
export function formatAmount(amount, originalFormat = null) {
  // Round to 2 decimal places for consistent output
  const rounded = Math.round(amount * 100) / 100;
  
  // If we have the original format and it uses Unicode fractions, try to match style
  if (originalFormat) {
    const usesUnicodeFractions = /[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/.test(originalFormat);
    if (usesUnicodeFractions) {
      return formatWithUnicodeFractions(rounded);
    }
  }
  
  // For whole numbers, return as integers
  if (Math.floor(rounded) === rounded) {
    return rounded.toString();
  }
  
  // Check if it can be represented as a common fraction
  const fractional = rounded % 1;
  const wholePart = Math.floor(rounded);
  
  // Round to the nearest common fraction
  for (const [decimal, fraction] of Object.entries(fractionMap)) {
    if (Math.abs(fractional - parseFloat(decimal)) < 0.01) {
      if (wholePart === 0) {
        return fraction;
      } else {
        return `${wholePart} ${fraction}`;
      }
    }
  }
  
  // For values that aren't close to common fractions, format with 1 or 2 decimal places
  if (fractional < 0.1) {
    return rounded.toFixed(1);
  }
  
  return rounded.toFixed(2);
}

/**
 * Format a number using Unicode fractions where possible
 * @param {number} value - The value to format
 * @returns {string} The formatted value with Unicode fractions
 */
function formatWithUnicodeFractions(value) {
  const wholePart = Math.floor(value);
  const fractionalPart = value - wholePart;
  
  // Find the closest fraction
  let closestFraction = null;
  let smallestDifference = 1;
  
  for (const [decimal, fraction] of Object.entries(unicodeFractions)) {
    const difference = Math.abs(fractionalPart - parseFloat(decimal));
    if (difference < smallestDifference) {
      smallestDifference = difference;
      closestFraction = fraction;
    }
  }
  
  if (smallestDifference > 0.05) {
    // If no close fraction match, just use decimal
    return value.toString();
  }
  
  if (wholePart === 0) {
    return closestFraction;
  } else {
    return `${wholePart}${closestFraction}`;
  }
}

/**
 * Normalize a unit string
 * @param {string} unit - The unit to normalize
 * @returns {string} The normalized unit
 */
function normalizeUnit(unit) {
  if (!unit) return '';
  
  // Convert to lowercase
  let normalized = unit.toLowerCase().trim();
  
  // Remove final 's' if plural (except for some common units that we keep as-is)
  if (normalized.endsWith('s') && 
      !['tablespoons', 'teaspoons', 'cups', 'ounces', 'pounds', 'grams', 'kilograms'].includes(normalized)) {
    normalized = normalized.slice(0, -1);
  }
  
  // Handle common abbreviations
  const abbreviations = {
    'tbsp': 'tablespoon',
    'tbl': 'tablespoon',
    'tbs': 'tablespoon',
    'tsp': 'teaspoon',
    't': 'teaspoon',
    'oz': 'ounce',
    'lb': 'pound',
    'g': 'gram',
    'kg': 'kilogram',
    'ml': 'milliliter',
    'l': 'liter',
    'c': 'cup',
    'fl oz': 'fluid ounce'
  };
  
  return abbreviations[normalized] || normalized;
}

/**
 * Determine the measurement system of a unit
 * @param {string} unit - The unit to check
 * @returns {string} The measurement system ('us', 'metric', or 'unknown')
 */
function getUnitSystem(unit) {
  const usUnits = ['cup', 'tablespoon', 'teaspoon', 'fluid ounce', 'pound', 'ounce', 'quart', 'gallon', 'pint'];
  const metricUnits = ['milliliter', 'liter', 'gram', 'kilogram'];
  
  if (usUnits.includes(unit)) {
    return 'us';
  } else if (metricUnits.includes(unit)) {
    return 'metric';
  } else {
    return 'unknown';
  }
}

/**
 * Convert a US measurement to metric
 * @param {number} amount - The amount to convert
 * @param {string} unit - The US unit
 * @returns {object} The converted amount and unit
 */
function convertUSToMetric(amount, unit) {
  let convertedAmount, convertedUnit;
  
  switch (unit) {
    case 'cup':
      convertedAmount = amount * conversionFactors.cup_to_ml;
      convertedUnit = 'ml';
      // Convert to liters if large enough
      if (convertedAmount >= 1000) {
        convertedAmount /= 1000;
        convertedUnit = 'L';
      }
      break;
    
    case 'tablespoon':
      convertedAmount = amount * conversionFactors.tablespoon_to_ml;
      convertedUnit = 'ml';
      break;
    
    case 'teaspoon':
      convertedAmount = amount * conversionFactors.teaspoon_to_ml;
      convertedUnit = 'ml';
      break;
    
    case 'fluid ounce':
      convertedAmount = amount * conversionFactors.fluidOunce_to_ml;
      convertedUnit = 'ml';
      break;
    
    case 'pound':
      convertedAmount = amount * conversionFactors.pound_to_g;
      convertedUnit = 'g';
      // Convert to kg if large enough
      if (convertedAmount >= 1000) {
        convertedAmount /= 1000;
        convertedUnit = 'kg';
      }
      break;
    
    case 'ounce':
      convertedAmount = amount * conversionFactors.ounce_to_g;
      convertedUnit = 'g';
      break;
    
    default:
      // Can't convert this unit
      return { amount: formatAmount(amount), unit };
  }
  
  return {
    amount: formatAmount(convertedAmount),
    unit: convertedUnit
  };
}

/**
 * Convert a metric measurement to US
 * @param {number} amount - The amount to convert
 * @param {string} unit - The metric unit
 * @returns {object} The converted amount and unit
 */
function convertMetricToUS(amount, unit) {
  let convertedAmount, convertedUnit;
  
  switch (unit) {
    case 'milliliter':
      // Small amounts -> teaspoons
      if (amount < 15) {
        convertedAmount = amount / conversionFactors.teaspoon_to_ml;
        convertedUnit = 'teaspoon';
      }
      // Medium amounts -> tablespoons
      else if (amount < 60) {
        convertedAmount = amount / conversionFactors.tablespoon_to_ml;
        convertedUnit = 'tablespoon';
      }
      // Larger amounts -> fluid ounces
      else if (amount < 240) {
        convertedAmount = amount / conversionFactors.fluidOunce_to_ml;
        convertedUnit = 'fluid ounce';
      }
      // Larger amounts -> cups
      else {
        convertedAmount = amount / conversionFactors.cup_to_ml;
        convertedUnit = 'cup';
      }
      break;
    
    case 'liter':
      // Convert to milliliters first
      return convertMetricToUS(amount * 1000, 'milliliter');
    
    case 'gram':
      // Small amounts -> ounces
      if (amount < 100) {
        convertedAmount = amount / conversionFactors.ounce_to_g;
        convertedUnit = 'ounce';
      }
      // Larger amounts -> pounds
      else {
        convertedAmount = amount / conversionFactors.pound_to_g;
        convertedUnit = 'pound';
      }
      break;
    
    case 'kilogram':
      // Convert to grams first
      return convertMetricToUS(amount * 1000, 'gram');
    
    default:
      // Can't convert this unit
      return { amount: formatAmount(amount), unit };
  }
  
  return {
    amount: formatAmount(convertedAmount),
    unit: convertedUnit
  };
}

/**
 * Adjust ingredient amount based on multiplier
 * @param {string} amount - The original amount
 * @param {number} multiplier - The multiplier to apply
 * @returns {string} The adjusted amount
 */
export function adjustAmount(amount, multiplier) {
  // Parse the amount
  const parsedAmount = parseAmount(amount);
  
  // Check if we have a range object
  if (typeof parsedAmount === 'object' && parsedAmount.isRange) {
    // Multiply both min and max values
    const adjustedMin = parsedAmount.min * multiplier;
    const adjustedMax = parsedAmount.max * multiplier;
    
    // Format both values
    const formattedMin = formatAmount(adjustedMin);
    const formattedMax = formatAmount(adjustedMax);
    
    // Recreate the range with the same format as the original
    if (amount.includes(' to ')) {
      return `${formattedMin} to ${formattedMax}`;
    } else {
      return `${formattedMin}-${formattedMax}`;
    }
  }
  
  // Not a range, or couldn't parse
  if (isNaN(parsedAmount)) {
    return amount; // Return original if can't parse
  }
  
  // Apply multiplier to regular value
  const adjustedAmount = parsedAmount * multiplier;
  
  // Format the result, preserving original format if available
  return formatAmount(adjustedAmount, amount);
}

/**
 * Format an ingredient for display
 * @param {object} ingredient - The ingredient object
 * @param {string} system - The measurement system ('us' or 'metric')
 * @param {number} multiplier - The multiplier to apply
 * @returns {object} The formatted ingredient
 */
export function formatIngredient(ingredient, system, multiplier) {
  const formatted = { ...ingredient };
  
  // Get the detected measurement system from the page
  const originalSystem = ingredient.system || 'us';
  
  // Apply the multiplier to the amount regardless of system
  if (formatted.amount) {
    // Adjust the amount using our improved function
    formatted.amount = adjustAmount(formatted.amount, multiplier);
    
    // Handle pluralization based on the amount
    if (formatted.unit) {
      const parsedAmount = parseAmount(formatted.amount);
      
      // Only pluralize for non-range values
      if (typeof parsedAmount !== 'object') {
        // Check if we need to pluralize the unit
        if (!isNaN(parsedAmount) && parsedAmount > 1) {
          // Pluralize common units
          if (formatted.unit === 'cup') formatted.unit = 'cups';
          else if (formatted.unit === 'tablespoon') formatted.unit = 'tablespoons';
          else if (formatted.unit === 'teaspoon') formatted.unit = 'teaspoons';
          else if (formatted.unit === 'ounce') formatted.unit = 'ounces';
          else if (formatted.unit === 'pound') formatted.unit = 'pounds';
        }
      }
    }
  }
  
  // Skip unit conversion by default - preserve the original units from the recipe
  // Only convert if explicitly changing measurement systems
  if (system !== originalSystem && system !== 'original') {
    // Convert to the requested system
    if (formatted.amount && formatted.unit) {
      const isCountableItem = 
        !formatted.unit || 
        ['whole', 'piece', 'pieces', 'lb', 'lbs', 'pound', 'pounds', 'kg', 'chicken', 'onion', 'onions'].includes(
          formatted.unit.toLowerCase()
        );
      
      // Don't convert units for countable items
      if (!isCountableItem) {
        // Handle range conversion
        const parsedAmount = parseAmount(formatted.amount);
        
        if (typeof parsedAmount === 'object' && parsedAmount.isRange) {
          // Convert min and max values separately
          const minConverted = convertMeasurement(parsedAmount.min.toString(), formatted.unit, system);
          const maxConverted = convertMeasurement(parsedAmount.max.toString(), formatted.unit, system);
          
          // Use the same unit for both (should be the same anyway)
          formatted.unit = minConverted.unit;
          
          // Recreate the range format
          if (formatted.amount.includes(' to ')) {
            formatted.amount = `${minConverted.amount} to ${maxConverted.amount}`;
          } else {
            formatted.amount = `${minConverted.amount}-${maxConverted.amount}`;
          }
        } else {
          // Regular conversion
          const converted = convertMeasurement(formatted.amount, formatted.unit, system);
          formatted.amount = converted.amount;
          formatted.unit = converted.unit;
        }
      }
    }
  }
  
  return formatted;
}