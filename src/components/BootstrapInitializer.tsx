'use client';

import { useEffect, useState } from 'react';

// Extend Window interface to include Bootstrap
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bootstrap: any;
  }
}

export default function BootstrapInitializer() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize Bootstrap components when available
    const initializeBootstrap = () => {
      if (typeof window !== 'undefined' && window.bootstrap && !initialized) {
        console.log('Bootstrap loaded successfully:', window.bootstrap);
        setInitialized(true);
        
        // Initialize all tooltips
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].map(tooltipTriggerEl => new window.bootstrap.Tooltip(tooltipTriggerEl));

        // Initialize all dropdowns
        const dropdownElementList = document.querySelectorAll('.dropdown-toggle');
        [...dropdownElementList].map(dropdownToggleEl => new window.bootstrap.Dropdown(dropdownToggleEl));
        
        // Initialize popovers if any
        const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
        [...popoverTriggerList].map(popoverTriggerEl => new window.bootstrap.Popover(popoverTriggerEl));
      } else if (!initialized && !window.bootstrap) {
        console.log('Bootstrap not yet loaded, retrying...');
        setTimeout(initializeBootstrap, 100);
      }
    };

    // Add a delay to ensure Bootstrap is loaded
    const timer = setTimeout(initializeBootstrap, 300);
    
    return () => clearTimeout(timer);
  }, [initialized]);

  return null; // This component doesn't render anything
}