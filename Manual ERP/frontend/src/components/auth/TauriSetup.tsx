import React, { useState } from 'react';
import { Building, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { getActiveFetch, getCentralServicesUrl, getDiscoveryServiceUrl, isTauriClient, logToConsole } from '../../utils/apiService';

interface TauriSetupProps {
  onSuccess: (companyCode: string, serverUrl: string) => void;
}

export default function TauriSetup({ onSuccess }: TauriSetupProps) {
  const [companyCode, setCompanyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[DISCOVERY] Form submit triggered');
    logToConsole('info', '[DISCOVERY] Form submit triggered');

    const trimmedCode = companyCode.trim();
    if (!trimmedCode) {
      console.warn('[DISCOVERY] Validation failure: Company Code is empty');
      logToConsole('warn', '[DISCOVERY] Validation failure: Company Code is empty');
      return;
    }

    console.log('[DISCOVERY] Validation passed for code:', trimmedCode);
    logToConsole('info', `[DISCOVERY] Validation passed for code: "${trimmedCode}"`);

    setLoading(true);
    setErrorMsg(null);

    const targetUrl = getDiscoveryServiceUrl();
    console.log('[DISCOVERY] Request URL resolved to:', targetUrl);
    logToConsole('info', `[DISCOVERY] Request URL resolved to: "${targetUrl}"`);

    const requestBody = { companyCode: trimmedCode };
    console.log('[DISCOVERY] Request body prepared:', requestBody);
    logToConsole('info', `[DISCOVERY] Request body prepared: ${JSON.stringify(requestBody)}`);

    console.log('[DISCOVERY] Starting network request');
    logToConsole('info', '[DISCOVERY] Starting network request');

    console.log("=== DISCOVERY DEBUG ===");
    console.log("Discovery URL:", targetUrl);
    console.log("Environment URL:", import.meta.env.VITE_DISCOVERY_SERVICE_URL);
    console.log("=======================");

    try {
      const activeFetch = getActiveFetch();
      console.log('[DISCOVERY] Resolved activeFetch function:', activeFetch);
      
      const response = await activeFetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[DISCOVERY] Response received:', response.status, response.statusText);
      logToConsole('info', `[DISCOVERY] Response received: ${response.status} (${response.statusText})`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        console.error('[DISCOVERY] Request failure response:', response.status, errorText);
        logToConsole('error', `[DISCOVERY] Request failure response: Status ${response.status}. Body: ${errorText}`);
        throw new Error(`Discovery service returned status ${response.status}. Details: ${errorText}`);
      }

      console.log('[DISCOVERY] Parsing response JSON');
      const data = await response.json();
      console.log('[DISCOVERY] Response parsed successfully:', data);
      logToConsole('info', `[DISCOVERY] Response parsed successfully: ${JSON.stringify(data)}`);

      if (data && data.success && data.serverUrl) {
        console.log('[DISCOVERY] URL stored successfully in memory, triggering onSuccess callback');
        logToConsole('info', `[DISCOVERY] URL stored: "${data.serverUrl}", triggering onSuccess callback`);
        
        try {
          onSuccess(trimmedCode, data.serverUrl);
          console.log('[DISCOVERY] Navigation triggered successfully');
          logToConsole('info', '[DISCOVERY] Navigation triggered successfully');
        } catch (navErr: any) {
          console.error('[DISCOVERY] Navigation failure:', navErr);
          logToConsole('error', `[DISCOVERY] Navigation failure: ${navErr.message || navErr.toString()}`);
          throw navErr;
        }
      } else {
        const errMsg = data.message || 'Invalid Company Code or registration not found.';
        console.warn('[DISCOVERY] Storage/Validation failure: serverUrl not returned by registry:', errMsg);
        logToConsole('warn', `[DISCOVERY] Storage/Validation failure: ${errMsg}`);
        throw new Error(errMsg);
      }
    } catch (err: any) {
      console.error('[DISCOVERY] Connection/Request failure caught:', err);
      logToConsole('error', `[DISCOVERY] Connection/Request failure caught: ${err.message || err.toString()}`);
      
      let extraDiagnostics = '';
      if (err.message && (err.message.includes('scope') || err.message.includes('not allowed'))) {
        extraDiagnostics = `\n\n=== SCOPE REJECTION DIAGNOSTICS ===\n` +
          `• Requested URL: ${targetUrl}\n` +
          `• Environment Config: ${import.meta.env.VITE_DISCOVERY_SERVICE_URL || 'Not Set'}\n` +
          `• HTTP Client Used: ${isTauriClient() ? 'Tauri plugin-http fetch' : 'Browser standard fetch'}\n` +
          `• Runtime Env Mode: ${import.meta.env.MODE || 'development'}\n` +
          `=====================================`;
        console.error(extraDiagnostics);
        logToConsole('error', extraDiagnostics);
      }

      const description = `Failed to connect to Discovery Service.\n` + 
        `• Target: ${targetUrl}\n` +
        `• Error: ${err.message || err.toString()}\n` +
        `• Client Type: ${isTauriClient() ? 'Tauri Native' : 'Browser'}` +
        extraDiagnostics;
      setErrorMsg(description);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-2xl shadow-xl relative animate-fade-in">
      <div className="flex justify-center mb-6">
        <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-500">
          <Shield className="w-8 h-8" />
        </div>
      </div>

      <div className="text-center">
        <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase">ERP Desktop Launcher</span>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1 font-display">Workspace Connection</h2>
        <p className="text-[var(--text-secondary)] text-xs mt-1.5 leading-normal">
          Enter your Company Workspace Code to locate your dedicated enterprise server.
        </p>
      </div>

      {errorMsg && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-start gap-2 text-red-500 text-xs leading-normal whitespace-pre-line">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">
            Company Code
          </label>
          <div className="mt-1 relative">
            <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              required
              placeholder="e.g. ABC001, APPLE"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none transition-colors uppercase"
              disabled={loading}
            />
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
            Ask your administrator for your company tenant key.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading || !companyCode.trim()}
          onClick={() => {
            console.log('[DISCOVERY] Connect button clicked directly via onClick');
            logToConsole('info', '[DISCOVERY] Connect button clicked directly via onClick');
          }}
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Resolving Workspace...</span>
            </>
          ) : (
            'Connect Workspace'
          )}
        </button>
      </form>
    </div>
  );
}
