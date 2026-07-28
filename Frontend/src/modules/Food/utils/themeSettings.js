import { publicGetOnce } from "@food/api";

export const applyDynamicTheme = async () => {
  try {
    const root = document.documentElement;

    // 1. Instantly apply cached colors synchronously to prevent color flashing/shifting on refresh
    const cachedUserPrimary = localStorage.getItem('user_app_primary');
    const cachedUserSecondary = localStorage.getItem('user_app_secondary');
    if (cachedUserPrimary) {
      root.style.setProperty('--primary', cachedUserPrimary);
      root.style.setProperty('--color-primary', cachedUserPrimary);
      root.style.setProperty('--color-primary-orange', cachedUserPrimary);
    }
    if (cachedUserSecondary) {
      root.style.setProperty('--secondary', cachedUserSecondary);
      root.style.setProperty('--color-secondary', cachedUserSecondary);
    }

    const cachedAdPrimary = localStorage.getItem('admin_app_primary');
    const cachedAdSecondary = localStorage.getItem('admin_app_secondary');
    const cachedAdSidebarFont = localStorage.getItem('admin_app_sidebar_font');
    if (cachedAdPrimary) root.style.setProperty('--ad-primary', cachedAdPrimary);
    if (cachedAdSecondary) root.style.setProperty('--ad-primary-strong', cachedAdSecondary);
    if (cachedAdSidebarFont) root.style.setProperty('--sidebar-font-color', cachedAdSidebarFont);

    const apps = ['user_app', 'restaurant_app', 'delivery_app', 'admin_app'];
    
    // Fetch all configurations simultaneously using the public endpoint
    const timestamp = Date.now();
    const promises = apps.map(appType => 
      publicGetOnce(`/app-config/${appType}`, { noCache: true, params: { _ts: timestamp } }).catch(() => null)
    );
    
    const results = await Promise.all(promises);
    
    const path = window.location.pathname;
    let currentAppType = 'user_app';
    if (path.includes('/restaurant')) currentAppType = 'restaurant_app';
    else if (path.includes('/delivery')) currentAppType = 'delivery_app';
    else if (path.includes('/admin')) currentAppType = 'admin_app';
    
    results.forEach((response, index) => {
      const activeConfig = response?.data?.data || response?.data;
      if (!activeConfig) return;
      
      const appType = apps[index];
      
      if (appType === 'user_app') {
        if (activeConfig.primaryColor) {
          root.style.setProperty('--primary', activeConfig.primaryColor);
          root.style.setProperty('--color-primary', activeConfig.primaryColor);
          root.style.setProperty('--color-primary-orange', activeConfig.primaryColor);
          localStorage.setItem('user_app_primary', activeConfig.primaryColor);
        }
        if (activeConfig.secondaryColor) {
          root.style.setProperty('--secondary', activeConfig.secondaryColor);
          root.style.setProperty('--color-secondary', activeConfig.secondaryColor);
          localStorage.setItem('user_app_secondary', activeConfig.secondaryColor);
        }
        if (activeConfig.logoUrl) {
          localStorage.setItem('user_app_logo', activeConfig.logoUrl);
        }
      } 
      else if (appType === 'restaurant_app') {
        if (activeConfig.primaryColor) {
          root.style.setProperty('--rt-primary', activeConfig.primaryColor);
          localStorage.setItem('restaurant_app_primary', activeConfig.primaryColor);
        }
        if (activeConfig.secondaryColor) {
          root.style.setProperty('--rt-primary-strong', activeConfig.secondaryColor);
          localStorage.setItem('restaurant_app_secondary', activeConfig.secondaryColor);
        }
        if (activeConfig.logoUrl) {
          localStorage.setItem('restaurant_app_logo', activeConfig.logoUrl);
        }
      }
      else if (appType === 'delivery_app') {
        if (activeConfig.primaryColor) {
          root.style.setProperty('--dv-primary', activeConfig.primaryColor);
          localStorage.setItem('delivery_app_primary', activeConfig.primaryColor);
        }
        if (activeConfig.secondaryColor) {
          root.style.setProperty('--dv-primary-strong', activeConfig.secondaryColor);
          localStorage.setItem('delivery_app_secondary', activeConfig.secondaryColor);
        }
        if (activeConfig.logoUrl) {
          localStorage.setItem('delivery_app_logo', activeConfig.logoUrl);
        }
      }
      else if (appType === 'admin_app') {
        if (activeConfig.primaryColor) {
          root.style.setProperty('--ad-primary', activeConfig.primaryColor);
          localStorage.setItem('admin_app_primary', activeConfig.primaryColor);
        }
        if (activeConfig.secondaryColor) {
          root.style.setProperty('--ad-primary-strong', activeConfig.secondaryColor);
          localStorage.setItem('admin_app_secondary', activeConfig.secondaryColor);
        }
        if (activeConfig.sidebarFontColor) {
          root.style.setProperty('--sidebar-font-color', activeConfig.sidebarFontColor);
          localStorage.setItem('admin_app_sidebar_font', activeConfig.sidebarFontColor);
        }
        if (activeConfig.logoUrl) {
          localStorage.setItem('admin_app_logo', activeConfig.logoUrl);
        }
      }
      
      // Apply font-family and hover color based on the current active app context
      if (appType === currentAppType) {
        if (activeConfig.fontFamily) {
          root.style.setProperty('--main-font-family', activeConfig.fontFamily);
        }
        if (activeConfig.buttonHoverColor) {
          root.style.setProperty('--button-hover-color', activeConfig.buttonHoverColor);
        }
        if (activeConfig.sidebarFontColor) {
          root.style.setProperty('--sidebar-font-color', activeConfig.sidebarFontColor);
          localStorage.setItem('admin_app_sidebar_font', activeConfig.sidebarFontColor);
        }
      }
    });

    // Dispatch global event once all themes are applied
    window.dispatchEvent(new CustomEvent('themeLoaded', { detail: { updated: true } }));

  } catch (error) {
    console.warn("Failed to load dynamic themes, falling back to default", error);
  }
};
