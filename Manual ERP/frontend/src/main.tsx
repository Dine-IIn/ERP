import React, { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)
