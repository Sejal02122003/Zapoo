import { createContext, useContext } from 'react';

export const LocationContext = createContext(null);

export function useLocationContext() {
  return useContext(LocationContext);
}

/** Fallback object when LocationProvider is not available */
const fallbackLocationContext = {
  location: null,
  effectiveLocation: null,
  deliveryAddressMode: 'saved',
  loading: false,
  error: null,
  permissionGranted: false,
  zoneId: null,
  zone: null,
  zoneStatus: 'idle',
  isInService: true,
  isOutOfService: false,
  isLocationResolved: false,
  address: '',
  requestLocation: async () => null,
  setSavedLocation: async () => {},
  setDeliveryAddressMode: () => {},
  refreshZone: async () => {},
  startWatchingLocation: () => {},
  stopWatchingLocation: () => {},
};

/** @deprecated Prefer useAppLocation - same context, clearer name for reads */
export function useLocationFromContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    console.warn('[locationContext] useLocation called outside LocationProvider, using fallback defaults');
    return fallbackLocationContext;
  }
  return ctx;
}
