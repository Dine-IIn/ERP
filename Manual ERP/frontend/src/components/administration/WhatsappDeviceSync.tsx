import React, { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, LogOut, CheckCircle2, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';

interface WhatsappDeviceSyncProps {
  apiRequest: (url: string, method?: string, body?: any) => Promise<any>;
}

export default function WhatsappDeviceSync({ apiRequest }: WhatsappDeviceSyncProps) {
  const [status, setStatus] = useState<string>('DISCONNECTED');
  const [qr, setQr] = useState<string | undefined>(undefined);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Poll status when connecting or waiting for QR code scan
  useEffect(() => {
    fetchStatus();
    
    const interval = setInterval(() => {
      // Always poll if connecting or qr is pending, to sync immediately upon user scan completion
      if (status === 'CONNECTING' || status === 'PENDING_QR') {
        fetchStatus();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [status]);

  const fetchStatus = async () => {
    try {
      const res = await apiRequest('/api/whatsapp/status', 'GET');
      if (res) {
        setStatus(res.status);
        setQr(res.qr);
        setPhoneNumber(res.phoneNumber);
        setDisplayName(res.displayName);
      }
    } catch (e: any) {
      console.error('Failed to fetch WhatsApp status:', e);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await apiRequest('/api/whatsapp/connect', 'POST');
      // Trigger status fetch immediately
      await fetchStatus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize WhatsApp link connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to log out and unlink your WhatsApp device? Automated messages will stop working.')) {
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await apiRequest('/api/whatsapp/disconnect', 'POST');
      setStatus('DISCONNECTED');
      setQr(undefined);
      setPhoneNumber(null);
      setDisplayName(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect WhatsApp device.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Linked & Active
          </span>
        );
      case 'PENDING_QR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Scanning Code Pending
          </span>
        );
      case 'CONNECTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> Connecting Server...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/25">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Unlinked / Disconnected
          </span>
        );
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6 text-left max-w-4xl mx-auto select-none">
      {/* Title */}
      <div className="border-b border-[var(--border-color)] pb-3">
        <h3 className="font-bold text-base text-[var(--text-primary)] font-display flex items-center gap-2 uppercase tracking-wide">
          <Smartphone className="w-5 h-5 text-indigo-400" /> WhatsApp Linked Device Sync
        </h3>
        <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">
          Scan the QR Code with your WhatsApp app on your smartphone to activate automated document sending.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl border bg-red-500/10 text-red-400 border-red-500/20 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Connection Status panel */}
        <div className="md:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl flex flex-col gap-4 text-left shadow-sm justify-between">
          <div className="flex flex-col gap-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-color)]/50 pb-2.5">
              Device Link Status
            </h4>

            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Link State</span>
              {getStatusBadge()}
            </div>

            {status === 'CONNECTED' && (
              <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-[var(--bg-primary)]/50 border border-[var(--border-color)]/50 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[9.5px] text-[var(--text-muted)] uppercase font-semibold">Device Profile</span>
                  <span className="font-bold text-white">{displayName || 'Linked WhatsApp Session'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[9.5px] text-[var(--text-muted)] uppercase font-semibold">Phone Number</span>
                  <span className="font-mono text-indigo-400 font-bold">+{phoneNumber}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-4">
            {status === 'DISCONNECTED' ? (
              <button
                type="button"
                disabled={loading}
                onClick={handleConnect}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 active:scale-95"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
                Connect WhatsApp Device
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConnect}
                  className="flex-1 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-[var(--border-active)] text-[var(--text-secondary)] hover:text-white text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reconnect
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDisconnect}
                  className="flex-1 py-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-rose-500/20 flex items-center justify-center gap-1 active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* QR Scanner view or guide panel */}
        <div className="md:col-span-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl flex flex-col gap-4 text-center shadow-sm items-center justify-center min-h-[300px]">
          {status === 'CONNECTED' ? (
            <div className="flex flex-col items-center justify-center gap-3 p-4">
              <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h4 className="text-sm font-bold text-white">Your WhatsApp is Linked!</h4>
              <p className="text-[var(--text-secondary)] text-[10px] max-w-sm leading-relaxed">
                The ERP background manager is now synchronized with your mobile device. Transactions can now be dispatched automatically to customer mobile chats.
              </p>
            </div>
          ) : status === 'PENDING_QR' && qr ? (
            <div className="flex flex-col items-center gap-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Scan WhatsApp QR Code</h4>
              <div className="bg-white p-3.5 rounded-2xl shadow-inner border border-slate-200">
                <img src={qr} alt="WhatsApp Sync QR Code" className="w-[180px] h-[180px] select-none" />
              </div>
              <div className="flex items-start gap-2 bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-xl max-w-xs text-left text-[9px] text-[var(--text-secondary)] leading-relaxed mt-1 select-none">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                <span>
                  Open WhatsApp on your mobile, tap <strong>Menu / Settings</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong> and point your camera at the QR code above.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-4 text-[var(--text-muted)] select-none">
              <Smartphone className="w-12 h-12 text-[var(--border-color)]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">No active sync session</h4>
              <p className="text-[var(--text-muted)] text-[10px] max-w-xs leading-relaxed">
                Click the <strong>Connect WhatsApp Device</strong> button on the left to spin up a connection and generate a QR synchronization code.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
