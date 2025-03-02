// This script runs on Instacart pages
// It automatically triggers the next search after a user is redirected to the storefront or adds an item to cart

// Check if we're on an Instacart page
if (window.location.hostname.includes('instacart.com')) {
  console.log('RecipeCart: Instacart content script loaded');
  
  // Function to check if we're on the storefront page or a page after adding to cart
  function shouldCheckForNextIngredient() {
    // Check if we're on the storefront page
    if (window.location.href.includes('/storefront') || 
        window.location.pathname === '/store' ||
        window.location.pathname === '/store/') {
      return true;
    }
    
    // Check if we're on a search page (might be after adding to cart)
    if (window.location.pathname.includes('/search/')) {
      // Look for indicators that an item was added to cart, like the cart counter increasing
      const cartCountElement = document.querySelector('.cart-count, .cart-icon-badge');
      if (cartCountElement) {
        return true;
      }
    }
    
    return false;
  }
  
  // Function to check if the cart modal is open
  function isCartModalOpen() {
    return !!document.querySelector('.cart-modal, .cart-sidebar, [data-testid="cart-sidebar"]');
  }
  
  // Function to check for "Add to Cart" buttons being clicked
  function setupAddToCartListeners() {
    // Find all add to cart buttons
    const addToCartButtons = document.querySelectorAll('[data-testid="add-to-cart"], button[aria-label="Add to cart"], .add-to-cart-button');
    
    addToCartButtons.forEach(button => {
      button.addEventListener('click', () => {
        console.log('RecipeCart: Add to cart button clicked');
        // Set a flag in storage to indicate that an item was added
        chrome.storage.local.set({ itemAddedToCart: true });
        
        // Wait a moment and check if we should move to the next ingredient
        setTimeout(checkForNextIngredient, 1500);
      });
    });
  }
  
  // Check if we should move to the next ingredient
  function checkForNextIngredient() {
    chrome.storage.local.get(['instacartSearchTerms', 'instacartCurrentIndex', 'itemAddedToCart'], (data) => {
      const { instacartSearchTerms, instacartCurrentIndex, itemAddedToCart } = data;
      
      // If we don't have a flag set that an item was added, don't proceed
      if (!itemAddedToCart) {
        return;
      }
      
      // Reset the flag
      chrome.storage.local.set({ itemAddedToCart: false });
      
      // Make sure we have search terms and a valid current index
      if (instacartSearchTerms && instacartSearchTerms.length > 0 && 
          instacartCurrentIndex !== undefined && instacartCurrentIndex < instacartSearchTerms.length - 1) {
        
        // Increment the index
        const nextIndex = instacartCurrentIndex + 1;
        
        // Update the index in storage
        chrome.storage.local.set({ instacartCurrentIndex: nextIndex }, () => {
          // Show a notification to the user
          const notification = document.createElement('div');
          notification.style.position = 'fixed';
          notification.style.top = '20px';
          notification.style.left = '50%';
          notification.style.transform = 'translateX(-50%)';
          notification.style.backgroundColor = '#4CAF50';
          notification.style.color = 'white';
          notification.style.padding = '12px 20px';
          notification.style.borderRadius = '8px';
          notification.style.zIndex = '10000';
          notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
          notification.textContent = `Item added! Loading next ingredient (${nextIndex + 1}/${instacartSearchTerms.length})...`;
          
          document.body.appendChild(notification);
          
          // Redirect to the next search after a short delay
          setTimeout(() => {
            window.location.href = `https://www.instacart.com/store/search/${instacartSearchTerms[nextIndex]}`;
          }, 1500);
        });
      } else if (instacartSearchTerms && instacartCurrentIndex !== undefined && 
               instacartCurrentIndex === instacartSearchTerms.length - 1) {
        // We've completed all searches, show a completion message
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = 'white';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '8px';
        notification.style.zIndex = '10000';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        notification.textContent = '🎉 All ingredients added to your cart! 🎉';
        
        document.body.appendChild(notification);
        
        // Remove the next button as all ingredients have been added
        const nextButton = document.getElementById('recipe-cart-next-button');
        if (nextButton) {
          nextButton.remove();
        }
        
        // Clear the search terms from storage
        chrome.storage.local.remove(['instacartSearchTerms', 'instacartCurrentIndex', 'itemAddedToCart']);
        
        // After a delay, the notification disappears
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transition = 'opacity 0.5s';
          setTimeout(() => {
            notification.remove();
          }, 500);
        }, 3000);
      }
    });
  }
  
  // Add a floating button to manually trigger the next item
  function addManualNextButton() {
    chrome.storage.local.get(['instacartSearchTerms', 'instacartCurrentIndex'], (data) => {
      const { instacartSearchTerms, instacartCurrentIndex } = data;
      
      // Only add the button if we have search terms and there are still ingredients to add
      if (instacartSearchTerms && instacartSearchTerms.length > 0 && 
          instacartCurrentIndex !== undefined && instacartCurrentIndex < instacartSearchTerms.length - 1) {
        
        // First, remove any existing button (to avoid duplicates)
        const existingButton = document.getElementById('recipe-cart-next-button');
        if (existingButton) {
          existingButton.remove();
        }
        
        const nextButton = document.createElement('button');
        nextButton.id = 'recipe-cart-next-button';
        nextButton.textContent = 'Next Ingredient →';
        nextButton.style.position = 'fixed';
        nextButton.style.bottom = '20px';
        nextButton.style.right = '20px';
        nextButton.style.backgroundColor = '#FF6B35';
        nextButton.style.color = 'white';
        nextButton.style.padding = '10px 15px';
        nextButton.style.borderRadius = '5px';
        nextButton.style.border = 'none';
        nextButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        nextButton.style.zIndex = '10000';
        nextButton.style.cursor = 'pointer';
        
        nextButton.addEventListener('click', () => {
          // Set the flag and check for next ingredient
          chrome.storage.local.set({ itemAddedToCart: true }, () => {
            checkForNextIngredient();
          });
        });
        
        document.body.appendChild(nextButton);
      }
    });
  }
  
  // Wait for the page to fully load
  window.addEventListener('load', () => {
    console.log('RecipeCart: Page loaded, checking if we should proceed');
    
    // Add event listeners to "Add to Cart" buttons
    setupAddToCartListeners();
    
    // Add a manual "Next" button
    addManualNextButton();
    
    // If we're on a page where we should check for the next ingredient
    if (shouldCheckForNextIngredient()) {
      checkForNextIngredient();
    }
    
    // Also set up a MutationObserver to watch for cart changes
    const observer = new MutationObserver((mutations) => {
      // Look for changes that might indicate an item was added to cart
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          // If the cart modal appears, we might have added an item
          if (isCartModalOpen()) {
            console.log('RecipeCart: Cart modal detected, checking for next ingredient');
            
            // Set the flag and check
            chrome.storage.local.set({ itemAddedToCart: true }, () => {
              // Wait a moment for the cart to update
              setTimeout(checkForNextIngredient, 1500);
            });
            
            // Disconnect observer to avoid multiple triggers
            observer.disconnect();
            break;
          }
        }
      }
    });
    
    // Start observing the document
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden']
    });
  });
}