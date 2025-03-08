// This script runs on Uber Eats pages
// It provides a floating panel with all ingredients to add

// Check if we're on an Uber Eats page
if (window.location.hostname.includes('ubereats.com')) {
    console.log('RecipeCart: Uber Eats content script loaded');
    
    // State variables
    let isCartOpen = false;
    
    // Wait for the page to fully load
    window.addEventListener('load', () => {
      initializeIngredientPanel();
      
      // Set up observer to detect cart modal state
      setupCartModalObserver();
    });
    
    /**
     * Clean ingredient name for search
     * @param {string} ingredient - The ingredient name to clean
     * @returns {string} The cleaned ingredient name
     */
    function cleanIngredientForSearch(ingredient) {
      // Decode first if it's URL encoded
      let decoded = decodeURIComponent(ingredient);
      
      // Remove fractions, numbers, and special characters
      decoded = decoded.replace(/\d+\/\d+|\d+\s+\d+\/\d+|\d+\.\d+|\d+/g, '').trim();
      decoded = decoded.replace(/[()[\]{},;:'"!?]/g, '');
      
      // Remove common measurement words
      const measurementWords = [
        'cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'teaspoon', 'teaspoons', 'tsp',
        'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'gram', 'grams', 'g', 'kg', 'ml', 'l'
      ];
      
      measurementWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        decoded = decoded.replace(regex, '');
      });
      
      // Replace multiple spaces with a single space
      decoded = decoded.replace(/\s+/g, ' ').trim();
      
      // Encode for URL
      return encodeURIComponent(decoded);
    }
    
    /**
     * Set up observer to detect when cart modal is opened or closed
     */
    function setupCartModalObserver() {
      // Check initial state immediately
      checkCartState();
      
      // Use MutationObserver to detect changes to the DOM
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' || 
              (mutation.type === 'attributes' && mutation.attributeName === 'aria-expanded')) {
            // Check cart state whenever DOM changes or aria-expanded attribute changes
            checkCartState();
          }
        }
      });
      
      // Start observing the document
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-expanded', 'aria-hidden']
      });
    }
  
    /**
   * Improved checkCartState function for Uber Eats
   * Replace the current checkCartState function with this one
   */
    function checkCartState() {
      // Method 1: Check for Uber Eats cart drawer based on the HTML structure you provided
      const cartDrawer = document.querySelector('div[data-test="cart"], [aria-modal="true"][role="dialog"]');
      
      // Method 2: Check for cart close button which only exists when cart is open
      const closeCartButton = document.querySelector('[data-testid="close-button"], [data-baseweb="button"][aria-label="Close"]');
      
      // Method 3: Look for specific elements from your HTML structure
      const cartHeader = document.querySelector('div[data-test="cart-header"]');
      
      // Update state based on checks
      const wasCartOpen = isCartOpen;
      isCartOpen = !!(cartDrawer || closeCartButton || cartHeader);
      
      console.log('RecipeCart: Checking cart state, isCartOpen:', isCartOpen);
      
      // Only update UI if state changed
      if (wasCartOpen !== isCartOpen) {
        updateCartButtonStates();
        console.log('RecipeCart: Cart state changed to', isCartOpen ? 'open' : 'closed');
        
        // If cart was opened, hide the panel and show minimized indicator
        if (isCartOpen) {
          const panel = document.getElementById('recipe-cart-panel');
          const minimizedIndicator = document.getElementById('recipe-cart-minimized');
          
          if (panel && minimizedIndicator) {
            panel.style.transform = 'translateX(350px)';
            setTimeout(() => {
              panel.style.display = 'none';
              minimizedIndicator.style.display = 'block';
            }, 300);
          }
        }
      }
    }
    
    /**
     * Update cart button states based on cart open/closed state
     */
    function updateCartButtonStates() {
      const viewCartBtn = document.getElementById('recipe-cart-view-cart-btn');
      const hideCartBtn = document.getElementById('recipe-cart-hide-cart-btn');
      
      if (!viewCartBtn || !hideCartBtn) return;
      
      if (isCartOpen) {
        viewCartBtn.style.display = 'none';
        hideCartBtn.style.display = 'block';
      } else {
        viewCartBtn.style.display = 'block';
        hideCartBtn.style.display = 'none';
      }
    }
    
    // Initialize the ingredient panel
    function initializeIngredientPanel() {
      // Get ingredients list from storage
      chrome.storage.local.get(['ubereatsSearchTerms', 'currentService', 'checkedIngredients'], (data) => {
        const { ubereatsSearchTerms, currentService, checkedIngredients = {} } = data;
        
        // Only proceed if we have ingredients and Uber Eats is the selected service
        if (ubereatsSearchTerms && ubereatsSearchTerms.length > 0 && currentService === 'ubereats') {
          // Create a floating panel with all ingredients
          createIngredientPanel(ubereatsSearchTerms, checkedIngredients);
          
          // Set up listeners for "Add to Cart" buttons
          setupAddToCartListeners();
        }
      });
    }
    
    /**
     * Make an element draggable
     * @param {HTMLElement} element - The element to make draggable
     * @param {HTMLElement} handle - The element to use as a drag handle
     */
    function makeDraggable(element, handle) {
      let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
      
      handle.style.cursor = 'move';
      handle.onmousedown = dragMouseDown;
      
      function dragMouseDown(e) {
        e.preventDefault();
        // Get the mouse cursor position at startup
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // Call a function whenever the cursor moves
        document.onmousemove = elementDrag;
      }
      
      function elementDrag(e) {
        e.preventDefault();
        // Calculate the new cursor position
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Set the element's new position
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.right = 'auto'; // Clear right position when dragging
      }
      
      function closeDragElement() {
        // Stop moving when mouse button is released
        document.onmouseup = null;
        document.onmousemove = null;
      }
    }
    
    /**
     * Create a floating panel with all ingredients
     * @param {Array} ingredients - List of ingredients to display
     * @param {Object} checkedItems - Object with checked state of ingredients
     */
    function createIngredientPanel(ingredients, checkedItems = {}) {
      // Remove any existing panel
      const existingPanel = document.getElementById('recipe-cart-panel');
      if (existingPanel) {
        existingPanel.remove();
      }
      
      // Remove any existing minimized indicator
      const existingIndicator = document.getElementById('recipe-cart-minimized');
      if (existingIndicator) {
        existingIndicator.remove();
      }
      
      // Create the panel container
      const panel = document.createElement('div');
      panel.id = 'recipe-cart-panel';
      panel.style.position = 'fixed';
      panel.style.bottom = '70px';
      panel.style.right = '20px';
      panel.style.width = '300px';
      panel.style.maxHeight = '70vh';
      panel.style.backgroundColor = 'white';
      panel.style.borderRadius = '8px';
      panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      panel.style.zIndex = '9999';
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';
      panel.style.overflow = 'hidden';
      panel.style.fontFamily = 'Arial, sans-serif';
      panel.style.transition = 'transform 0.3s ease-in-out';
      
      // Create the header (Uber Eats themed)
      const header = document.createElement('div');
      header.style.padding = '12px 16px';
      header.style.backgroundColor = '#06C167'; // Uber Eats green
      header.style.color = 'white';
      header.style.fontWeight = 'bold';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      
      const title = document.createElement('div');
      title.textContent = 'RecipeCart for Uber Eats';
      
      const btnContainer = document.createElement('div');
      
      // Create minimize button
      const minimizeBtn = document.createElement('button');
      minimizeBtn.textContent = '−';
      minimizeBtn.style.background = 'none';
      minimizeBtn.style.border = 'none';
      minimizeBtn.style.color = 'white';
      minimizeBtn.style.fontSize = '16px';
      minimizeBtn.style.marginLeft = '8px';
      minimizeBtn.style.cursor = 'pointer';
      minimizeBtn.title = 'Minimize panel';
      
      // Create close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.background = 'none';
      closeBtn.style.border = 'none';
      closeBtn.style.color = 'white';
      closeBtn.style.fontSize = '20px';
      closeBtn.style.marginLeft = '8px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.title = 'Close panel';
      
      btnContainer.appendChild(minimizeBtn);
      btnContainer.appendChild(closeBtn);
      header.appendChild(title);
      header.appendChild(btnContainer);
      panel.appendChild(header);
      
      // Create minimized indicator (hidden by default)
      const minimizedIndicator = document.createElement('div');
      minimizedIndicator.id = 'recipe-cart-minimized';
      minimizedIndicator.textContent = '📋 Show Ingredients';
      minimizedIndicator.style.position = 'fixed';
      minimizedIndicator.style.bottom = '20px';
      minimizedIndicator.style.right = '20px';
      minimizedIndicator.style.backgroundColor = '#06C167'; // Uber Eats green
      minimizedIndicator.style.color = 'white';
      minimizedIndicator.style.padding = '8px 16px';
      minimizedIndicator.style.borderRadius = '20px';
      minimizedIndicator.style.fontWeight = 'bold';
      minimizedIndicator.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      minimizedIndicator.style.cursor = 'pointer';
      minimizedIndicator.style.zIndex = '9999';
      minimizedIndicator.style.display = 'none';
      document.body.appendChild(minimizedIndicator);
      
      // Create progress indicator
      const progress = document.createElement('div');
      progress.style.padding = '8px 16px';
      progress.style.backgroundColor = '#f5f5f5';
      progress.style.borderBottom = '1px solid #eee';
      progress.style.fontSize = '14px';
      
      // Calculate progress
      const totalCount = ingredients.length;
      const checkedCount = Object.keys(checkedItems).length;
      const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
      
      progress.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span>Progress: ${checkedCount}/${totalCount} items</span>
          <span>${progressPercent}%</span>
        </div>
        <div style="height: 6px; background-color: #ddd; border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: ${progressPercent}%; background-color: #06C167;"></div>
        </div>
      `;
      
      panel.appendChild(progress);
      
      // Create the content area with ingredients list
      const content = document.createElement('div');
      content.style.padding = '12px 16px';
      content.style.overflowY = 'auto';
      content.style.maxHeight = 'calc(80vh - 180px)';
      
      // Add instructions
      const instructions = document.createElement('p');
      instructions.textContent = 'Click an ingredient to search for it:';
      instructions.style.marginTop = '0';
      instructions.style.marginBottom = '12px';
      instructions.style.fontSize = '14px';
      content.appendChild(instructions);
      
      // Add ingredient items
      const ingredientsList = document.createElement('ul');
      ingredientsList.style.listStyle = 'none';
      ingredientsList.style.padding = '0';
      ingredientsList.style.margin = '0';
      
      ingredients.forEach((ingredient, index) => {
        // Decode the ingredient name
        const decodedIngredient = decodeURIComponent(ingredient);
        
        const item = document.createElement('li');
        item.style.padding = '8px 12px';
        item.style.borderRadius = '4px';
        item.style.marginBottom = '8px';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.backgroundColor = '#f5f5f5';
        item.style.cursor = 'pointer';
        item.style.transition = 'background-color 0.2s';
        item.style.fontSize = '13px';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `ingredient-${index}`;
        checkbox.dataset.ingredient = ingredient;
        checkbox.style.marginRight = '10px';
        checkbox.style.cursor = 'pointer';
        
        const label = document.createElement('label');
        label.htmlFor = `ingredient-${index}`;
        label.textContent = decodedIngredient;
        label.style.flexGrow = '1';
        label.style.cursor = 'pointer';
        
        // Check if this ingredient is already checked
        const isChecked = checkedItems[ingredient] === true;
        if (isChecked) {
          checkbox.checked = true;
          item.style.backgroundColor = '#E6F7EF'; // Uber Eats light green tint
          item.style.textDecoration = 'line-through';
          label.style.color = '#666';
        }
        
        item.appendChild(checkbox);
        item.appendChild(label);
        
        // Function to search for ingredient on Uber Eats
        const searchForIngredient = (ingredientText) => {
          // Clean the ingredient name for search
          const cleanedIngredient = cleanIngredientForSearch(ingredientText);
          // Navigate to Uber Eats grocery search
          window.location.href = `https://www.ubereats.com/search?q=${cleanedIngredient}`;
        };
        
        // Add event listener for clicking on the item
        item.addEventListener('click', (e) => {
          // Don't search if clicking directly on the checkbox
          if (e.target !== checkbox) {
            searchForIngredient(ingredient);
          }
        });
        
        // Add event listener for the checkbox
        checkbox.addEventListener('change', (e) => {
          updateIngredientCheckState(checkbox, item, label);
          updateProgressIndicator();
          
          // If clicking the checkbox directly, also search for the ingredient
          searchForIngredient(ingredient);
          
          // Prevent the event from bubbling up to the item click handler
          e.stopPropagation();
        });
        
        ingredientsList.appendChild(item);
      });
      
      content.appendChild(ingredientsList);
      panel.appendChild(content);
      
      // Add a footer with actions
      const footer = document.createElement('div');
      footer.style.padding = '12px 16px';
      footer.style.borderTop = '1px solid #eee';
      footer.style.display = 'flex';
      footer.style.justifyContent = 'center'; // Center the buttons
      footer.style.alignItems = 'center';
      
      // Container for the buttons (to ensure they take up the same space)
      const buttonContainer = document.createElement('div');
      buttonContainer.style.width = '100%';
      buttonContainer.style.position = 'relative';
      
      const viewCartBtn = document.createElement('button');
      viewCartBtn.id = 'recipe-cart-view-cart-btn';
      viewCartBtn.textContent = 'View Uber Eats Cart';
      viewCartBtn.style.padding = '10px 12px';
      viewCartBtn.style.backgroundColor = '#06C167'; // Uber Eats green
      viewCartBtn.style.color = 'white';
      viewCartBtn.style.border = 'none';
      viewCartBtn.style.borderRadius = '4px';
      viewCartBtn.style.cursor = 'pointer';
      viewCartBtn.style.width = '100%';
      viewCartBtn.style.fontSize = '14px';
      viewCartBtn.style.fontWeight = 'bold';
      viewCartBtn.style.position = 'absolute';
      viewCartBtn.style.top = '0';
      viewCartBtn.style.left = '0';
      
      const hideCartBtn = document.createElement('button');
      hideCartBtn.id = 'recipe-cart-hide-cart-btn';
      hideCartBtn.textContent = 'Hide Cart';
      hideCartBtn.style.padding = '10px 12px';
      hideCartBtn.style.backgroundColor = '#f0f0f0';
      hideCartBtn.style.color = '#333';
      hideCartBtn.style.border = 'none';
      hideCartBtn.style.borderRadius = '4px';
      hideCartBtn.style.cursor = 'pointer';
      hideCartBtn.style.width = '100%';
      hideCartBtn.style.fontSize = '14px';
      hideCartBtn.style.fontWeight = 'bold';
      hideCartBtn.style.position = 'absolute';
      hideCartBtn.style.top = '0';
      hideCartBtn.style.left = '0';
      hideCartBtn.style.display = 'none'; // Hidden by default
      
      // Add placeholder to make the container maintain height
      const buttonPlaceholder = document.createElement('div');
      buttonPlaceholder.style.height = '38px'; // Match button height
      buttonPlaceholder.style.width = '100%';
      
      buttonContainer.appendChild(viewCartBtn);
      buttonContainer.appendChild(hideCartBtn);
      buttonContainer.appendChild(buttonPlaceholder);
      
      footer.appendChild(buttonContainer);
      panel.appendChild(footer);
      
      // Add the panel to the page
      document.body.appendChild(panel);
      
      // Make panel draggable
      makeDraggable(panel, header);
      
      // Check initial cart state
      updateCartButtonStates();
      
      // Function to update progress indicator
      function updateProgressIndicator() {
        chrome.storage.local.get(['checkedIngredients'], (result) => {
          const checkedIngredients = result.checkedIngredients || {};
          const checkedCount = Object.keys(checkedIngredients).length;
          const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
          
          progress.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>Progress: ${checkedCount}/${totalCount} items</span>
              <span>${progressPercent}%</span>
            </div>
            <div style="height: 6px; background-color: #ddd; border-radius: 3px; overflow: hidden;">
              <div style="height: 100%; width: ${progressPercent}%; background-color: #06C167;"></div>
            </div>
          `;
        });
      }
      
      // Add event listeners to buttons
      closeBtn.addEventListener('click', () => {
        panel.remove();
        minimizedIndicator.remove();
        
        // Clear ingredient data when closing
        chrome.storage.local.remove(['ubereatsSearchTerms']);
      });
      
      minimizeBtn.addEventListener('click', () => {
        panel.style.transform = 'translateX(350px)';
        setTimeout(() => {
          panel.style.display = 'none';
          minimizedIndicator.style.display = 'block';
        }, 300);
      });
      
      minimizedIndicator.addEventListener('click', () => {
        minimizedIndicator.style.display = 'none';
        panel.style.display = 'flex';
        setTimeout(() => {
          panel.style.transform = 'translateX(0)';
        }, 10);
      });
      
      viewCartBtn.addEventListener('click', () => {
        // First, find the Uber Eats cart button
        const uberEatsCartButton = document.querySelector('[aria-label="checkout"], [data-baseweb="button"][aria-label="Cart"], button[data-testid="cart-button"]');
        
        if (uberEatsCartButton) {
          // Click the Uber Eats cart button to show the cart modal
          uberEatsCartButton.click();
          console.log('RecipeCart: Clicking Uber Eats cart button');
          
          // Hide the panel and show the minimized indicator
          panel.style.transform = 'translateX(350px)';
          setTimeout(() => {
            panel.style.display = 'none';
            minimizedIndicator.style.display = 'block';
          }, 300);
          
          // Update cart state
          isCartOpen = true;
          updateCartButtonStates();
        } else {
          // Fallback: navigate to checkout page if button not found
          console.log('RecipeCart: Cart button not found, navigating to checkout');
          window.location.href = 'https://www.ubereats.com/checkout';
        }
      });
      
      hideCartBtn.addEventListener('click', () => {
        // For Uber Eats, try to find and click the close button on the cart modal
        // Based on your HTML structure, we need to look for the "Close" button
        const closeCartButton = document.querySelector('[data-baseweb="button"][aria-label="Close"], [data-testid="close-button"], button[aria-label="Close"]');
        
        if (closeCartButton) {
          console.log('RecipeCart: Found and clicking close cart button');
          closeCartButton.click();
          
          // Update cart state
          isCartOpen = false;
          updateCartButtonStates();
        } else {
          // If close button not found, try alternative selectors
          const alternativeCloseButton = document.querySelector('.yn .yp button, [role="dialog"] button:first-child');
          if (alternativeCloseButton) {
            console.log('RecipeCart: Found alternative close button');
            alternativeCloseButton.click();
          } else {
            // Fallback: press Escape key to close modal
            console.log('RecipeCart: No close button found, sending Escape key');
            document.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'Escape',
              code: 'Escape',
              keyCode: 27,
              which: 27,
              bubbles: true
            }));
          }
        }
      });
    }
    
    /**
     * Update ingredient check state in storage and UI
     * @param {HTMLElement} checkbox - The checkbox element
     * @param {HTMLElement} item - The list item element
     * @param {HTMLElement} label - The label element
     */
    function updateIngredientCheckState(checkbox, item, label) {
      const ingredient = checkbox.dataset.ingredient;
      
      chrome.storage.local.get(['checkedIngredients'], (result) => {
        const checkedIngredients = result.checkedIngredients || {};
        
        if (checkbox.checked) {
          item.style.backgroundColor = '#E6F7EF'; // Uber Eats light green tint
          item.style.textDecoration = 'line-through';
          label.style.color = '#666';
          
          // Save checked state
          checkedIngredients[ingredient] = true;
        } else {
          item.style.backgroundColor = '#f5f5f5';
          item.style.textDecoration = 'none';
          label.style.color = 'inherit';
          
          // Remove from checked state
          delete checkedIngredients[ingredient];
        }
        
        // Save back to storage
        chrome.storage.local.set({ checkedIngredients });
      });
    }
    
    /**
     * Set up listeners for Add to Cart buttons
     */
    function setupAddToCartListeners() {
      // Use a MutationObserver to detect when Add to Cart buttons are added to the DOM
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Uber Eats specific selectors
            const addToCartButtons = document.querySelectorAll('[data-test="add-to-cart-button"], [aria-label="Add to cart"], button[data-test-id="add-to-cart-button"]');
            
            addToCartButtons.forEach(button => {
              // Check if we've already added a listener to this button
              if (!button.dataset.recipeCartListener) {
                button.dataset.recipeCartListener = 'true';
                
                button.addEventListener('click', () => {
                  console.log('RecipeCart: Detected Add to Cart click on Uber Eats');
                  
                  // Try to get the product name
                  const productName = getProductName(button);
                  if (productName) {
                    // Try to find a matching ingredient in our list
                    findMatchingIngredient(productName);
                  }
                });
              }
            });
          }
        }
      });
      
      // Start observing the document
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Find product name from Add to Cart button
      function getProductName(button) {
        try {
          // First try the closest product card
          const productCard = button.closest('[data-test="store-item-card"], [data-test="menu-item-wrapper"]');
          if (productCard) {
            const nameElement = productCard.querySelector('[data-test="store-item-title"], [data-test="menu-item-title"]');
            if (nameElement) {
              return nameElement.textContent.trim();
            }
          }
          
          // Try other common patterns for Uber Eats
          const itemTitle = document.querySelector('h1[data-test="item-title"], [data-test="menu-item-name"]');
          if (itemTitle) {
            return itemTitle.textContent.trim();
          }
          
          return null;
        } catch (error) {
          console.error('Error getting product name:', error);
          return null;
        }
      }
      
      // Find matching ingredient from product name
      function findMatchingIngredient(productName) {
        if (!productName) return;
        
        chrome.storage.local.get(['ubereatsSearchTerms'], (data) => {
          const { ubereatsSearchTerms } = data;
          
          if (!ubereatsSearchTerms || ubereatsSearchTerms.length === 0) {
            return;
          }
          
          // Try to find a matching ingredient
          const normalizedProductName = productName.toLowerCase();
          
          for (const ingredient of ubereatsSearchTerms) {
            const decodedIngredient = decodeURIComponent(ingredient).toLowerCase();
            
            // Check if product name contains the ingredient name
            if (normalizedProductName.includes(decodedIngredient)) {
              console.log(`RecipeCart: Found matching ingredient: ${decodedIngredient}`);
              
              // Check this ingredient in the panel
              const checkbox = document.querySelector(`input[data-ingredient="${ingredient}"]`);
              if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                const item = checkbox.closest('li');
                const label = item.querySelector('label');
                updateIngredientCheckState(checkbox, item, label);
                
                // Show a notification
                showNotification(`Added ${decodedIngredient} to cart!`);
                
                // Update the progress indicator
                const panel = document.getElementById('recipe-cart-panel');
                if (panel) {
                  const progress = panel.querySelector('div:nth-child(2)');
                  if (progress) {
                    chrome.storage.local.get(['checkedIngredients'], (result) => {
                      const checkedIngredients = result.checkedIngredients || {};
                      const totalCount = ubereatsSearchTerms.length;
                      const checkedCount = Object.keys(checkedIngredients).length;
                      const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
                      
                      progress.innerHTML = `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                          <span>Progress: ${checkedCount}/${totalCount} items</span>
                          <span>${progressPercent}%</span>
                        </div>
                        <div style="height: 6px; background-color: #ddd; border-radius: 3px; overflow: hidden;">
                          <div style="height: 100%; width: ${progressPercent}%; background-color: #06C167;"></div>
                        </div>
                      `;
                    });
                  }
                }
                
                // Break after finding a match
                break;
              }
            }
          }
        });
      }
    }
    
    /**
     * Show a notification to the user
     * @param {string} message - The notification message
     */
    function showNotification(message) {
      // Remove any existing notification
      const existingNotification = document.getElementById('recipe-cart-notification');
      if (existingNotification) {
        existingNotification.remove();
      }
      
      // Create notification element (Uber Eats themed)
      const notification = document.createElement('div');
      notification.id = 'recipe-cart-notification';
      notification.style.position = 'fixed';
      notification.style.bottom = '20px';
      notification.style.left = '20px';
      notification.style.backgroundColor = '#06C167'; // Uber Eats green
      notification.style.color = 'white';
      notification.style.padding = '12px 20px';
      notification.style.borderRadius = '4px';
      notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      notification.style.zIndex = '10000';
      notification.style.fontSize = '14px';
      notification.textContent = message;
      
      // Add to page
      document.body.appendChild(notification);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
          notification.remove();
        }, 500);
      }, 3000);
    }
  }