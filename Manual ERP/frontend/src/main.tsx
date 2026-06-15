import React, { StrictMode, StrictMode as _StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { config } from './config'
import { logToConsole, isTauriClient } from './utils/apiService'

// Startup Diagnostics
console.log(`=========================================`);
console.log(`🚀 [ERP Startup Diagnostics]`);
console.log(`• Discovery URL: ${config.discoveryServiceUrl || 'Not Configured'}`);
if (isTauriClient()) {
  let allowed = config.allowedRemoteUrl;
  if (!allowed && config.centralServicesUrl) {
    try {
      allowed = `${new URL(config.centralServicesUrl).origin}/*`;
    } catch (e) {}
  }
  console.log(`• Tauri HTTP Scope: ${allowed || 'Not Configured'}`);
  logToConsole('info', `[Startup] Discovery URL: "${config.discoveryServiceUrl}". Tauri HTTP Scope: "${allowed}"`).catch(() => {});
} else {
  console.log(`• Tauri HTTP Scope: N/A (Running in Browser)`);
}
console.log(`=========================================`);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes default caching
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-6 min-h-screen bg-[#0b0f19] text-white select-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase animate-pulse">
              Loading ERP workstation...
            </span>
          </div>
        </div>
      }>
        <App />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
)
