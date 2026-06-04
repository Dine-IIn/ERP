export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  centralServicesUrl: import.meta.env.VITE_CENTRAL_SERVICES_URL || 'http://localhost:6001',
  inactivityTimeoutMinutes: parseInt(import.meta.env.VITE_INACTIVITY_TIMEOUT_MINUTES || '30', 10)
};
