// Vercel Analytics - inject function for static sites
// Based on @vercel/analytics package

(function() {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Vercel Analytics: Skipping in development mode');
    return;
  }

  // Load Vercel Analytics script
  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://va.vercel-scripts.com/v1/script.debug.js';
  
  script.onerror = function() {
    console.warn('Vercel Analytics: Failed to load script');
  };
  
  document.head.appendChild(script);
  
  console.log('Vercel Analytics: Initialized');
})();
