# RecipeCart Browser Extension

## Overview
RecipeCart is a browser extension that extracts recipe ingredients from cooking websites and allows you to send them directly to your Instacart shopping cart. Perfect for bakers and cooking enthusiasts who want to streamline the process of shopping for recipe ingredients.

## Features

### Basic Features
- Automatically extract ingredients from recipe websites
- Switch between US customary and metric units
- Scale recipes with 1x, 2x, or 3x multipliers
- Send ingredients directly to Instacart
- Copy all ingredients to clipboard
- Save favorite recipes for future reference

### Premium Features
- Smart product matching for better Instacart recommendations
- Batch processing of multiple recipes at once
- Automatic quantity adjustments with precision scaling
- Favorite store preferences for shopping

## Project Structure
```
recipe-cart/
│
├── manifest.json              # Extension configuration file
│
├── popup/                     # Popup UI files
│   ├── popup.html            # Main popup UI layout
│   ├── popup.css             # Styling for popup
│   └── popup.js              # Popup functionality
│
├── content/                   # Content scripts (runs on webpage)
│   ├── content.js            # Script to extract recipe data
│   └── content.css           # Styling for injected elements
│
├── background/                # Background service worker
│   └── background.js         # Handles communication and Instacart integration
│
├── utils/                     # Utility functions and shared code
│   ├── parser.js             # Recipe parsing logic
│   ├── instacart.js          # Instacart API integration
│   └── storage.js            # Local storage utilities
│
├── assets/                    # Extension assets
│   ├── icon-16.png           # Small icon
│   ├── icon-32.png           # Medium icon
│   ├── icon-48.png           # Large icon
│   ├── icon-128.png          # Extra large icon
│   └── logo.svg              # Vector logo for UI
│
├── lib/                       # Third-party libraries (if needed)
│   └── transitions.css        # Library for smooth transitions
│
└── welcome/                   # Welcome page for new users
    └── welcome.html          # Onboarding screen
```

## Installation

### Development Installation
1. Clone this repository:
   ```
   git clone https://github.com/stevencodeblooded/recipe-cart.git
   ```

2. Open Chrome/Edge/Brave and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top-right corner

4. Click "Load unpacked" and select the `recipe-cart` directory

5. The extension should now be installed and visible in your browser toolbar

### Production Installation
*Coming soon to the Chrome Web Store and other browser extension stores.*

## Usage

1. Visit any recipe website that contains an ingredients list
2. Click the RecipeCart icon in your browser toolbar
3. Click "Extract Ingredients" to parse the recipe data
4. Adjust units (US/Metric) or quantities (1x/2x/3x) as needed
5. Click "Send to Instacart" to add all ingredients to your cart
6. Alternatively, use "Copy All" to copy ingredients to clipboard

## Supported Websites
RecipeCart works with most popular recipe websites, including:
- Food blogs using WordPress Recipe Maker (WPRM)
- Sites with structured data using Schema.org recipe markup
- Most other recipe websites with standard ingredient lists

## Development

### Prerequisites
- Node.js (v14 or higher)
- NPM or Yarn

### Setup
1. Install dependencies:
   ```
   npm install
   ```

2. Build the extension:
   ```
   npm run build
   ```

3. For development with hot-reloading:
   ```
   npm run dev
   ```

### Testing
```
npm test
```

## How It Works

### Ingredient Extraction
The extension injects a content script that analyzes the webpage DOM to find recipe ingredients. It supports multiple formats:
1. WordPress Recipe Maker (WPRM) format
2. Schema.org recipe markup
3. Generic recipe format detection

### Measurement Conversion
The extension can convert between US customary units and metric units:
- Cups ↔ Milliliters/Liters
- Tablespoons/Teaspoons ↔ Milliliters
- Ounces/Pounds ↔ Grams/Kilograms

### Instacart Integration
The extension formats the ingredients for Instacart's search system and opens Instacart with those ingredients ready to add to your cart.

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements
- All the amazing recipe websites that make cooking accessible to everyone
- Instacart for their grocery delivery service

---

Built with ❤️ for bakers and cooking enthusiasts