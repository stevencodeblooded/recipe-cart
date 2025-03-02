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
    
    // Normalize the unit (lowercase, singular)
    const normalizedUnit = normalizeUnit(unit);
    
    // Determine the current system
    const currentSystem = getUnitSystem(normalizedUnit);
    
    // If already in target system or system can't be determined, return as is
    if (currentSystem === targetSystem || currentSystem === 'unknown') {
      return { amount, unit };
    }
    
    // Convert based on the unit type
    if (currentSystem === 'us' && targetSystem === 'metric') {
      return convertUSToMetric(numericAmount, normalizedUnit);
    } else if (currentSystem === 'metric' && targetSystem === 'us') {
      return convertMetricToUS(numericAmount, normalizedUnit);
    }
    
    // Default fallback
    return { amount, unit };
  }
  
  /**
   * Parse an amount string to a numeric value
   * @param {string} amount - The amount to parse
   * @returns {number} The numeric value
   */
  export function parseAmount(amount) {
    // Handle simple numeric values
    if (!isNaN(parseFloat(amount))) {
      return parseFloat(amount);
    }
    
    // Handle fractions like "1/2"
    const fractionMatch = amount.match(/(\d+)\/(\d+)/);
    if (fractionMatch) {
      return parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
    }
    
    // Handle mixed numbers like "1 1/2"
    const mixedMatch = amount.match(/(\d+)\s+(\d+)\/(\d+)/);
    if (mixedMatch) {
      return parseInt(mixedMatch[1], 10) + 
             (parseInt(mixedMatch[2], 10) / parseInt(mixedMatch[3], 10));
    }
    
    // Handle ranges like "1-2" (take the average)
    const rangeMatch = amount.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
    }
    
    // Can't parse
    return NaN;
  }
  
  /**
   * Format a numeric amount back to a human-readable string
   * @param {number} amount - The numeric amount
   * @returns {string} The formatted amount
   */
  export function formatAmount(amount) {
    // Round to 2 decimal places for consistent output
    const rounded = Math.round(amount * 100) / 100;
    
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
    
    // Otherwise return as decimal
    return rounded.toString();
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
    
    // Remove final 's' if plural
    if (normalized.endsWith('s') && normalized !== 'tablespoons' && normalized !== 'teaspoons' && normalized !== 'cups' && normalized !== 'ounces') {
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
   * @param {number} multiplier - The multiplier to apply (1, 2, or 3)
   * @returns {string} The adjusted amount
   */
  export function adjustAmount(amount, multiplier) {
    // Parse the amount to a number
    const numericAmount = parseAmount(amount);
    
    if (isNaN(numericAmount)) {
      return amount; // Return original if can't parse
    }
    
    // Apply multiplier
    const adjustedAmount = numericAmount * multiplier;
    
    // Format back to string
    return formatAmount(adjustedAmount);
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
    
    // Apply multiplier to amount
    if (formatted.amount) {
      formatted.amount = adjustAmount(formatted.amount, multiplier);
    }
    
    // Convert measurement system if needed
    if (formatted.amount && formatted.unit && system) {
      const converted = convertMeasurement(formatted.amount, formatted.unit, system);
      formatted.amount = converted.amount;
      formatted.unit = converted.unit;
    }
    
    return formatted;
  }