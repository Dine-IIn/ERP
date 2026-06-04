import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Globe, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  PlusCircle, 
  Lock, 
  Server, 
  AlertCircle, 
  CheckCircle, 
  Save,
  Sliders,
  PlayCircle,
  Activity,
  Cpu,
  RotateCcw,
  Clock,
  Database,
  HardDrive,
  Cloud,
  Home,
  Wrench,
  ExternalLink,
  Info
} from 'lucide-react';
import { apiClient } from '../../utils/apiService';

interface CentralServicesProps {
  apiRequest: (path: string, method: string, body?: any) => Promise<any>;
}

export default function CentralServices({ apiRequest }: CentralServicesProps) {
  const [activeTab, setActiveTab] = useState<'licenses' | 'discovery' | 'updater' | 'monitor' | 'infrastructure'>('licenses');
  const [licenses, setLicenses] = useState<any[]>([]);
  const [discovery, setDiscovery] = useState<any[]>([]);
  const [nodeMonitor, setNodeMonitor] = useState<any[]>([]);
  const [devConfigs, setDevConfigs] = useState<any[]>([]);
  const [dbInfo, setDbInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // License Form State
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState<any | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseFingerprint, setLicenseFingerprint] = useState('');
  const [licenseCompanyCode, setLicenseCompanyCode] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<'ACTIVE' | 'EXPIRED'>('ACTIVE');

  // Discovery Form State
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [editingDiscovery, setEditingDiscovery] = useState<any | null>(null);
  const [discoveryCompanyCode, setDiscoveryCompanyCode] = useState('');
  const [discoveryCompanyName, setDiscoveryCompanyName] = useState('');
  const [discoveryServerUrl, setDiscoveryServerUrl] = useState('');
  const [discoveryStatus, setDiscoveryStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');

  // Updater Form State
  const [latestVersion, setLatestVersion] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [tauriUpdateSignature, setTauriUpdateSignature] = useState('');

  const showNotification = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lics, discs, upd, monitor, devs, db] = await Promise.all([
        apiRequest('/api/super/central/licenses', 'GET'),
        apiRequest('/api/super/central/discovery', 'GET'),
        apiRequest('/api/super/central/updater', 'GET'),
        apiRequest('/api/super/central/updater-status', 'GET'),
        apiRequest('/api/super/central/dev-configs', 'GET'),
        apiRequest('/api/super/db-info', 'GET')
      ]);
      setLicenses(lics || []);
      setDiscovery(discs || []);
      setNodeMonitor(Array.isArray(monitor) ? monitor : []);
      setDevConfigs(Array.isArray(devs) ? devs : []);
      setDbInfo(db || null);
      if (upd) {
        setLatestVersion(upd.latestVersion || '');
        setDownloadUrl(upd.downloadUrl || '');
        setReleaseNotes(upd.releaseNotes || '');
        setTauriUpdateSignature(upd.tauriUpdateSignature || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch registries from Central Services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh node monitor every 30 seconds
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  // License CRUD
  const handleOpenLicenseModal = (lic?: any) => {
    if (lic) {
      setEditingLicense(lic);
      setLicenseKey(lic.licenseKey);
      setLicenseFingerprint(lic.fingerprint || '');
      setLicenseCompanyCode(lic.companyCode || '');
      setLicenseStatus(lic.status || 'ACTIVE');
      // Auto-detect backend mode from devConfigs
      const existingDev = devConfigs.find(d => d.companyCode === (lic.companyCode || '').toUpperCase());
      if (existingDev) {
        setLicenseBackendMode('dev-managed');
        setLicenseDevConfigCode(existingDev.companyCode);
        setLicenseServerUrl('');
      } else {
        setLicenseBackendMode('self-hosted');
        setLicenseDevConfigCode('');
        const existingDisc = discovery.find(d => d.companyCode === (lic.companyCode || '').toUpperCase());
        setLicenseServerUrl(existingDisc?.serverUrl || '');
      }
    } else {
      setEditingLicense(null);
      setLicenseKey('');
      setLicenseFingerprint('');
      setLicenseCompanyCode('');
      setLicenseStatus('ACTIVE');
      setLicenseBackendMode('self-hosted');
      setLicenseDevConfigCode('');
      setLicenseServerUrl('');
    }
    setShowLicenseModal(true);
  };

  const handleSaveLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey || !licenseCompanyCode) return;
    setLoading(true);
    try {
      await apiRequest('/api/super/central/licenses', 'POST', {
        licenseKey,
        fingerprint: licenseFingerprint,
        companyCode: licenseCompanyCode,
        status: licenseStatus
      });

      // Auto-sync backend infrastructure based on selected mode
      if (licenseBackendMode === 'self-hosted' && licenseServerUrl) {
        await apiRequest('/api/super/central/discovery', 'POST', {
          companyCode: licenseCompanyCode.toUpperCase(),
          companyName: licenseCompanyCode.toUpperCase(),
          serverUrl: licenseServerUrl,
          status: 'ACTIVE'
        });
      } else if (licenseBackendMode === 'dev-managed' && licenseDevConfigCode) {
        const selectedDev = devConfigs.find(d => d.companyCode === licenseDevConfigCode);
        if (selectedDev) {
          await apiRequest('/api/super/central/dev-configs', 'POST', {
            companyCode: licenseCompanyCode.toUpperCase(),
            companyName: selectedDev.companyName,
            backendUrl: selectedDev.backendUrl,
            databaseType: selectedDev.databaseType,
            databaseHost: selectedDev.databaseHost,
            databaseName: selectedDev.databaseName,
            managedBy: selectedDev.managedBy,
            notes: selectedDev.notes,
            status: selectedDev.status
          });
        }
      }

      showNotification(`License saved and backend infrastructure synced.`, 'success');
      setShowLicenseModal(false);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save license key', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLicense = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete license key: ${key}?`)) return;
    setLoading(true);
    try {
      await apiRequest(`/api/super/central/licenses/${encodeURIComponent(key)}`, 'DELETE');
      showNotification(`License ${key} deleted`, 'success');
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete license key', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Discovery CRUD
  const handleOpenDiscoveryModal = (disc?: any) => {
    if (disc) {
      setEditingDiscovery(disc);
      setDiscoveryCompanyCode(disc.companyCode);
      setDiscoveryCompanyName(disc.companyName || '');
      setDiscoveryServerUrl(disc.serverUrl || '');
      setDiscoveryStatus(disc.status || 'ACTIVE');
    } else {
      setEditingDiscovery(null);
      setDiscoveryCompanyCode('');
      setDiscoveryCompanyName('');
      setDiscoveryServerUrl('');
      setDiscoveryStatus('ACTIVE');
    }
    setShowDiscoveryModal(true);
  };

  const handleSaveDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discoveryCompanyCode || !discoveryServerUrl) return;
    setLoading(true);
    try {
      await apiRequest('/api/super/central/discovery', 'POST', {
        companyCode: discoveryCompanyCode,
        companyName: discoveryCompanyName,
        serverUrl: discoveryServerUrl,
        status: discoveryStatus
      });
      showNotification(`Discovery registry mapping saved successfully`, 'success');
      setShowDiscoveryModal(false);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save discovery mapping', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDiscovery = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete discovery mapping for company code: ${code}?`)) return;
    setLoading(true);
    try {
      await apiRequest(`/api/super/central/discovery/${encodeURIComponent(code)}`, 'DELETE');
      showNotification(`Discovery mapping for code ${code} deleted`, 'success');
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete discovery mapping', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Updater Update
  const handleSaveUpdater = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/api/super/central/updater', 'POST', {
        latestVersion,
        downloadUrl,
        releaseNotes,
        tauriUpdateSignature
      });
      showNotification(`Dynamic Auto-Updater settings updated successfully`, 'success');
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save auto-updater settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Developer Config State
  const [showDevModal, setShowDevModal] = useState(false);
  const [editingDev, setEditingDev] = useState<any | null>(null);
  const [devCompanyCode, setDevCompanyCode] = useState('');
  const [devCompanyName, setDevCompanyName] = useState('');
  const [devBackendUrl, setDevBackendUrl] = useState('');
  const [devDatabaseType, setDevDatabaseType] = useState('postgresql');
  const [devDatabaseHost, setDevDatabaseHost] = useState('');
  const [devDatabaseName, setDevDatabaseName] = useState('');
  const [devManagedBy, setDevManagedBy] = useState('');
  const [devNotes, setDevNotes] = useState('');
  const [devStatus, setDevStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');

  const [useCurrentDevInfra, setUseCurrentDevInfra] = useState(false);
  const [backedUpDevConfig, setBackedUpDevConfig] = useState<any>({
    backendUrl: '',
    databaseType: 'postgresql',
    databaseHost: '',
    databaseName: '',
    managedBy: '',
    notes: ''
  });

  const handleOpenDevModal = (dev?: any) => {
    if (dev) {
      setEditingDev(dev);
      setDevCompanyCode(dev.companyCode);
      setDevCompanyName(dev.companyName || '');
      setDevBackendUrl(dev.backendUrl || '');
      setDevDatabaseType(dev.databaseType || 'postgresql');
      setDevDatabaseHost(dev.databaseHost || '');
      setDevDatabaseName(dev.databaseName || '');
      setDevManagedBy(dev.managedBy || '');
      setDevNotes(dev.notes || '');
      setDevStatus(dev.status || 'ACTIVE');
      setUseCurrentDevInfra(false);
    } else {
      setEditingDev(null);
      setDevCompanyCode('');
      setDevCompanyName('');
      setDevBackendUrl('');
      setDevDatabaseType('postgresql');
      setDevDatabaseHost('');
      setDevDatabaseName('');
      setDevManagedBy('');
      setDevNotes('');
      setDevStatus('ACTIVE');
      setUseCurrentDevInfra(false);
    }
    setShowDevModal(true);
  };

  const handleToggleCurrentDevInfra = (checked: boolean) => {
    setUseCurrentDevInfra(checked);
    if (checked) {
      setBackedUpDevConfig({
        backendUrl: devBackendUrl,
        databaseType: devDatabaseType,
        databaseHost: devDatabaseHost,
        databaseName: devDatabaseName,
        managedBy: devManagedBy,
        notes: devNotes
      });
      setDevBackendUrl(apiClient.getBaseUrl());
      setDevDatabaseType(dbInfo?.dbType?.toLowerCase() === 'postgresql' ? 'postgresql' : (dbInfo?.dbType?.toLowerCase() === 'sqlite' ? 'sqlite' : 'postgresql'));
      setDevDatabaseHost(dbInfo?.dbHost || 'localhost');
      setDevDatabaseName(dbInfo?.dbName || '');
      setDevManagedBy('developer-infrastructure');
      setDevNotes('Auto-configured from active developer infrastructure.');
    } else {
      setDevBackendUrl(backedUpDevConfig.backendUrl);
      setDevDatabaseType(backedUpDevConfig.databaseType);
      setDevDatabaseHost(backedUpDevConfig.databaseHost);
      setDevDatabaseName(backedUpDevConfig.databaseName);
      setDevManagedBy(backedUpDevConfig.managedBy);
      setDevNotes(backedUpDevConfig.notes);
    }
  };

  const handleSaveDevConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devCompanyCode || !devBackendUrl) return;
    setLoading(true);
    try {
      await apiRequest('/api/super/central/dev-configs', 'POST', {
        companyCode: devCompanyCode,
        companyName: devCompanyName,
        backendUrl: devBackendUrl,
        databaseType: devDatabaseType,
        databaseHost: devDatabaseHost,
        databaseName: devDatabaseName,
        managedBy: devManagedBy,
        notes: devNotes,
        status: devStatus
      });
      showNotification('Developer backend config saved. Discovery registry auto-synced.', 'success');
      setShowDevModal(false);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save dev config', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevConfig = async (code: string) => {
    if (!window.confirm(`Remove developer config for ${code}? The discovery mapping will NOT be auto-removed.`)) return;
    setLoading(true);
    try {
      await apiRequest(`/api/super/central/dev-configs/${encodeURIComponent(code)}`, 'DELETE');
      showNotification(`Dev config for ${code} removed`, 'success');
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete dev config', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Backend mode state (for license modal) ──────────────────────────────
  const [licenseBackendMode, setLicenseBackendMode] = useState<'self-hosted' | 'dev-managed'>('self-hosted');
  const [licenseServerUrl, setLicenseServerUrl] = useState('');
  const [licenseDevConfigCode, setLicenseDevConfigCode] = useState('');

  // Quick switch: flip a discovery entry to use a registered dev backend
  const handleQuickSwitchToDev = async (disc: any) => {
    const dev = devConfigs.find(d => d.companyCode === disc.companyCode);
    if (!dev) {
      showNotification(`No dev config for ${disc.companyCode}. Add one in the Infrastructure tab first.`, 'error');
      return;
    }
    try {
      await apiRequest('/api/super/central/dev-configs', 'POST', {
        companyCode: dev.companyCode, companyName: dev.companyName,
        backendUrl: dev.backendUrl, databaseType: dev.databaseType,
        databaseHost: dev.databaseHost, databaseName: dev.databaseName,
        managedBy: dev.managedBy, notes: dev.notes, status: 'ACTIVE'
      });
      showNotification(`${disc.companyCode} switched to Developer-Managed (${dev.backendUrl})`, 'success');
      fetchData();
    } catch (err: any) { showNotification(err.message || 'Switch failed', 'error'); }
  };

  // Quick switch: flip a discovery entry back to self-hosted (clear dev config)
  const handleQuickSwitchToSelf = async (disc: any) => {
    const url = window.prompt(`Enter self-hosted backend URL for ${disc.companyCode}:`, disc.serverUrl);
    if (!url) return;
    try {
      await apiRequest('/api/super/central/discovery', 'POST', {
        companyCode: disc.companyCode, companyName: disc.companyName,
        serverUrl: url, status: disc.status
      });
      showNotification(`${disc.companyCode} set to self-hosted backend (${url})`, 'success');
      fetchData();
    } catch (err: any) { showNotification(err.message || 'Switch failed', 'error'); }
  };

  // Activate a dev config: re-push it to the discovery registry
  const handleActivateDevConfig = async (dev: any) => {
    try {
      await apiRequest('/api/super/central/dev-configs', 'POST', {
        companyCode: dev.companyCode, companyName: dev.companyName,
        backendUrl: dev.backendUrl, databaseType: dev.databaseType,
        databaseHost: dev.databaseHost, databaseName: dev.databaseName,
        managedBy: dev.managedBy, notes: dev.notes, status: 'ACTIVE'
      });
      showNotification(`Dev backend for ${dev.companyCode} activated in Discovery registry.`, 'success');
      fetchData();
    } catch (err: any) { showNotification(err.message || 'Activation failed', 'error'); }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in select-none max-w-6xl mx-auto text-left">
      {/* Upper Status Bar */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] font-display flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-500" />
            Central Services Administration Portal
          </h2>
          <p className="text-[var(--text-muted)] text-[11px] mt-1">
            Manage global node settings, provision production licenses, configure DNS mapping scopes, and build update releases.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[var(--border-color)] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload Registries
        </button>
      </div>

      {/* Error & Success Badges */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('licenses')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'licenses'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Key className="w-4 h-4" />
          Licensing Keys ({licenses.length})
        </button>
        <button
          onClick={() => setActiveTab('discovery')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'discovery'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Globe className="w-4 h-4" />
          DNS Discovery ({discovery.length})
        </button>
        <button
          onClick={() => setActiveTab('updater')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'updater'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Auto-Updater Registry
        </button>
        <button
          onClick={() => setActiveTab('monitor')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'monitor'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Activity className="w-4 h-4" />
          Node Fleet Monitor
          {nodeMonitor.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded text-[9px] font-bold">
              {nodeMonitor.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('infrastructure')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'infrastructure'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Database className="w-4 h-4" />
          Infrastructure
        </button>
      </div>

      {/* TAB A: LICENSES */}
      {activeTab === 'licenses' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Issued Licensing Licenses
            </h3>
            <button
              onClick={() => handleOpenLicenseModal()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Issue License
            </button>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="p-4 font-semibold">License Key</th>
                  <th className="p-4 font-semibold">HW Fingerprint</th>
                  <th className="p-4 font-semibold">Tenant Code</th>
                  <th className="p-4 font-semibold">Backend</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {licenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                      No active licenses found in Central Services registry database.
                    </td>
                  </tr>
                ) : (
                  licenses.map(lic => {
                    const isDev = devConfigs.some(d => d.companyCode === (lic.companyCode || '').toUpperCase());
                    return (
                    <tr key={lic.licenseKey} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-400">{lic.licenseKey}</td>
                      <td className="p-4 font-mono text-[var(--text-secondary)] max-w-xs truncate" title={lic.fingerprint || 'Not Activated Yet'}>
                        {lic.fingerprint ? lic.fingerprint.substring(0, 16) + '...' : <span className="italic text-[var(--text-muted)] text-[10px]">Unbound</span>}
                      </td>
                      <td className="p-4 font-mono font-semibold">{lic.companyCode || <span className="italic text-[var(--text-muted)] text-[10px]">None</span>}</td>
                      <td className="p-4">
                        {lic.companyCode ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDev ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isDev ? <Wrench className="w-2.5 h-2.5" /> : <Home className="w-2.5 h-2.5" />}
                            {isDev ? 'Dev-Managed' : 'Self-Hosted'}
                          </span>
                        ) : <span className="text-[var(--text-muted)] text-[10px]">—</span>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          lic.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {lic.status}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenLicenseModal(lic)}
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Edit License"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLicense(lic.licenseKey)}
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-red-400 transition-colors cursor-pointer"
                          title="Revoke License"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB B: DISCOVERY */}
      {activeTab === 'discovery' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              DNS Name Service Mappings
            </h3>
            <button
              onClick={() => handleOpenDiscoveryModal()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Mapping
            </button>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="p-4 font-semibold">Company Code</th>
                  <th className="p-4 font-semibold">Company Name</th>
                  <th className="p-4 font-semibold">Backend URL</th>
                  <th className="p-4 font-semibold">Mode</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {discovery.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                      No DNS mappings registered in Discovery DB.
                    </td>
                  </tr>
                ) : (
                  discovery.map(disc => {
                    const isDevManaged = devConfigs.some(d => d.companyCode === disc.companyCode);
                    return (
                    <tr key={disc.companyCode} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-emerald-400">{disc.companyCode}</td>
                      <td className="p-4 font-semibold">{disc.companyName}</td>
                      <td className="p-4 font-mono text-[var(--text-secondary)] text-[10px] max-w-[160px] truncate" title={disc.serverUrl}>{disc.serverUrl}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isDevManaged
                              ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {isDevManaged ? <Wrench className="w-2.5 h-2.5" /> : <Home className="w-2.5 h-2.5" />}
                            {isDevManaged ? 'Dev-Managed' : 'Self-Hosted'}
                          </span>
                          {/* Quick toggle button */}
                          <button
                            onClick={() => isDevManaged ? handleQuickSwitchToSelf(disc) : handleQuickSwitchToDev(disc)}
                            title={isDevManaged ? 'Switch to Self-Hosted' : 'Switch to Dev-Managed'}
                            className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          >
                            {isDevManaged ? '→ Self' : '→ Dev'}
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          disc.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {disc.status}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDiscoveryModal(disc)}
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Edit Mapping"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDiscovery(disc.companyCode)}
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete Mapping"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB C: UPDATER */}
      {activeTab === 'updater' && (
        <form onSubmit={handleSaveUpdater} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl flex flex-col gap-4 animate-fade-in max-w-2xl">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3">
            Tauri & Node Binary Auto-Updates Publisher
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Latest Version</label>
              <input
                type="text"
                required
                placeholder="e.g. 1.1.0"
                value={latestVersion}
                onChange={e => setLatestVersion(e.target.value)}
                className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Download Binary URL</label>
              <input
                type="text"
                required
                placeholder="URL to executable/updater tarball"
                value={downloadUrl}
                onChange={e => setDownloadUrl(e.target.value)}
                className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Tauri Update Signature</label>
            <textarea
              rows={2}
              placeholder="Base64 encoded cryptographic signature payload"
              value={tauriUpdateSignature}
              onChange={e => setTauriUpdateSignature(e.target.value)}
              className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Release Notes</label>
            <textarea
              rows={3}
              required
              placeholder="Provide version update descriptions..."
              value={releaseNotes}
              onChange={e => setReleaseNotes(e.target.value)}
              className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-fit self-end bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            {loading ? 'Publishing release configs...' : 'Publish Update Release'}
          </button>
        </form>
      )}

      {/* TAB D: NODE FLEET MONITOR */}
      {activeTab === 'monitor' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Live Node Fleet Telemetry
              </h3>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                Real-time heartbeat and update status from every deployed ERP Server node. Auto-refreshes every 30s.
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[var(--border-color)] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Now
            </button>
          </div>

          {/* Summary Cards */}
          {nodeMonitor.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Nodes', value: nodeMonitor.length, color: 'indigo' },
                { label: 'Up-to-Date', value: nodeMonitor.filter(n => n.status === 'UP-TO-DATE' || n.status === 'RUNNING').length, color: 'emerald' },
                { label: 'Pending Update', value: nodeMonitor.filter(n => n.status === 'PENDING_UPDATE').length, color: 'amber' },
                { label: 'Rollback Active', value: nodeMonitor.filter(n => n.rollbackStatus && n.rollbackStatus !== 'NONE').length, color: 'red' },
              ].map(card => (
                <div key={card.label} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{card.label}</p>
                  <p className={`text-2xl font-black mt-1 text-${card.color}-400`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse text-xs min-w-[800px]">
              <thead>
                <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="p-4 font-semibold">Company</th>
                  <th className="p-4 font-semibold">Installed Ver.</th>
                  <th className="p-4 font-semibold">Latest Ver.</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Rollback</th>
                  <th className="p-4 font-semibold">License</th>
                  <th className="p-4 font-semibold">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {nodeMonitor.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-[var(--text-muted)]">
                      <div className="flex flex-col items-center gap-2">
                        <Cpu className="w-8 h-8 opacity-30" />
                        <span>No node heartbeats received yet. Nodes report in after boot and every 30 minutes.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  nodeMonitor.map(node => {
                    const isUpToDate = node.status === 'UP-TO-DATE' || node.status === 'RUNNING';
                    const isPending = node.status === 'PENDING_UPDATE';
                    const isUpdating = ['DOWNLOADING', 'BACKING_UP', 'RESTARTING', 'EXTRACT_FAILED', 'DOWNLOAD_FAILED', 'BACKUP_FAILED'].includes(node.status);
                    const isRolledBack = node.rollbackStatus && node.rollbackStatus !== 'NONE';

                    const statusColor = isUpToDate ? 'emerald' : isPending ? 'amber' : isUpdating ? 'blue' : 'red';
                    const rollbackColor = isRolledBack ? 'red' : 'text-[var(--text-muted)]';

                    const lastBeat = node.lastUpdateTime
                      ? new Date(node.lastUpdateTime).toLocaleString()
                      : '—';

                    return (
                      <tr key={node.companyCode} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                        <td className="p-4">
                          <p className="font-bold font-mono text-emerald-400">{node.companyCode}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{node.companyName}</p>
                        </td>
                        <td className="p-4 font-mono font-bold">
                          {node.installedVersion}
                          {node.installedVersion !== node.latestVersion && (
                            <span className="ml-1 text-amber-400 text-[9px]">↑ {node.latestVersion}</span>
                          )}
                        </td>
                        <td className="p-4 font-mono text-[var(--text-secondary)]">{node.latestVersion}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-${statusColor}-500/10 text-${statusColor}-400`}>
                            {isUpdating && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                            {node.status}
                          </span>
                          {node.message && (
                            <p className="text-[9px] text-[var(--text-muted)] mt-0.5 max-w-[160px] truncate" title={node.message}>{node.message}</p>
                          )}
                        </td>
                        <td className="p-4">
                          {isRolledBack ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400">
                              <RotateCcw className="w-2.5 h-2.5" />
                              {node.rollbackStatus}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-[10px]">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            node.licenseStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {node.licenseStatus || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1 text-[var(--text-muted)]">
                            <Clock className="w-3 h-3" />
                            {lastBeat}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB E: INFRASTRUCTURE */}
      {activeTab === 'infrastructure' && (
        <div className="flex flex-col gap-6 animate-fade-in">

          {/* Section 1: Database Info (read-only) */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2 mb-4">
              <HardDrive className="w-3.5 h-3.5 text-violet-400" />
              Current Database & Server Info
              <span className="ml-auto text-[9px] font-semibold text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-[var(--border-color)]">READ-ONLY</span>
            </h3>

            {!dbInfo ? (
              <p className="text-[var(--text-muted)] text-xs italic">Loading database info...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* DB Type */}
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Database Engine</p>
                  <p className="text-sm font-bold text-violet-400 mt-1 flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    {dbInfo.dbType}
                  </p>
                </div>
                {/* Hosting Mode */}
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Hosting Mode</p>
                  <p className={`text-sm font-bold mt-1 flex items-center gap-1.5 ${
                    dbInfo.hostingMode === 'cloud' ? 'text-blue-400' :
                    dbInfo.hostingMode === 'self-hosted' ? 'text-emerald-400' :
                    dbInfo.hostingMode === 'local-file' ? 'text-amber-400' : 'text-[var(--text-muted)]'
                  }`}>
                    {dbInfo.hostingMode === 'cloud' ? <Cloud className="w-4 h-4" /> :
                     dbInfo.hostingMode === 'self-hosted' ? <Home className="w-4 h-4" /> :
                     <HardDrive className="w-4 h-4" />}
                    {dbInfo.hostingMode === 'cloud' ? 'Cloud Hosted' :
                     dbInfo.hostingMode === 'self-hosted' ? 'Self-Hosted' :
                     dbInfo.hostingMode === 'local-file' ? 'Local File (SQLite)' : 'Unknown'}
                  </p>
                </div>
                {/* DB Host */}
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Host</p>
                  <p className="text-xs font-mono font-bold text-[var(--text-primary)] mt-1 truncate" title={dbInfo.dbHost}>
                    {dbInfo.dbHost || '—'}{dbInfo.dbPort ? `:${dbInfo.dbPort}` : ''}
                  </p>
                </div>
                {/* DB Name */}
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Database Name</p>
                  <p className="text-xs font-mono font-bold text-[var(--text-primary)] mt-1">{dbInfo.dbName || '—'}</p>
                </div>
                {/* Server uptime */}
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Server Uptime</p>
                  <p className="text-xs font-bold text-emerald-400 mt-1">
                    {dbInfo.uptime > 3600
                      ? `${Math.floor(dbInfo.uptime / 3600)}h ${Math.floor((dbInfo.uptime % 3600) / 60)}m`
                      : `${Math.floor(dbInfo.uptime / 60)}m ${dbInfo.uptime % 60}s`}
                  </p>
                </div>
                {/* Memory */}
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 border border-[var(--border-color)]">
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Heap Memory</p>
                  <p className="text-xs font-bold text-[var(--text-primary)] mt-1">{dbInfo.memoryUsedMB} MB used</p>
                </div>
              </div>
            )}

            {/* Masked URL row */}
            {dbInfo?.maskedUrl && dbInfo.maskedUrl !== '(not configured)' && (
              <div className="mt-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 flex items-center gap-2">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider shrink-0">Connection String</span>
                <code className="text-xs font-mono text-violet-300 truncate" title={dbInfo.maskedUrl}>{dbInfo.maskedUrl}</code>
                <span className="ml-auto shrink-0 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Masked
                </span>
              </div>
            )}

            {/* Node info row */}
            {dbInfo && (
              <div className="mt-2 flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
                <span>Node.js {dbInfo.serverVersion}</span>
                <span>PID {dbInfo.pid}</span>
                <span>Platform: {dbInfo.platform}</span>
              </div>
            )}
          </div>

          {/* Section 2: Developer-Managed Backends */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-violet-400" />
                  Developer-Managed Backends
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Register backends managed by the developer for companies that don't self-host. Saves auto-sync to Discovery registry.
                </p>
              </div>
              <button
                onClick={() => handleOpenDevModal()}
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Dev Backend
              </button>
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="p-4">Company</th>
                    <th className="p-4">Backend URL</th>
                    <th className="p-4">DB Engine</th>
                    <th className="p-4">DB Host</th>
                    <th className="p-4">Managed By</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {devConfigs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-[var(--text-muted)]">
                        <div className="flex flex-col items-center gap-2">
                          <Wrench className="w-8 h-8 opacity-30" />
                          <span>No developer-managed backends configured yet.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    devConfigs.map(dev => {
                      const linkedLic = licenses.find(l => (l.companyCode || '').toUpperCase() === dev.companyCode);
                      const isActiveInDiscovery = discovery.some(d => d.companyCode === dev.companyCode && d.serverUrl === dev.backendUrl);
                      return (
                      <tr key={dev.companyCode} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                        <td className="p-4">
                          <p className="font-bold font-mono text-violet-400">{dev.companyCode}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{dev.companyName}</p>
                          {linkedLic && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                              <Key className="w-2 h-2" /> {linkedLic.licenseKey.substring(0, 12)}...
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <a
                            href={dev.backendUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-blue-400 hover:underline flex items-center gap-1 text-[10px]"
                          >
                            {dev.backendUrl}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          {isActiveInDiscovery && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-emerald-400">
                              <CheckCircle className="w-2.5 h-2.5" /> Active in Discovery
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono text-[var(--text-secondary)]">{dev.databaseType}</td>
                        <td className="p-4 font-mono text-[var(--text-secondary)] text-[10px]">
                          {dev.databaseHost || '—'}
                          {dev.databaseName ? <span className="text-[var(--text-muted)]">&nbsp;/ {dev.databaseName}</span> : null}
                        </td>
                        <td className="p-4 text-[var(--text-secondary)]">{dev.managedBy || '—'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            dev.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>{dev.status}</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isActiveInDiscovery && (
                              <button
                                onClick={() => handleActivateDevConfig(dev)}
                                title="Activate in Discovery registry"
                                className="text-[10px] font-bold px-2 py-1 rounded bg-violet-600/20 text-violet-400 border border-violet-500/30 hover:bg-violet-600/40 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <PlayCircle className="w-3 h-3" /> Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenDevModal(dev)}
                              className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-violet-400 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDevConfig(dev.companyCode)}
                              className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LICENSE MODAL */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-scale-up text-left">
            <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              {editingLicense ? 'Edit License Configuration' : 'Provision System License Key'}
            </h3>

            <form onSubmit={handleSaveLicense} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">License Key</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ANB-LIC-2026-DEV"
                  disabled={!!editingLicense}
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                  className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Motherboard HW Fingerprint (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty for unbound license"
                  value={licenseFingerprint}
                  onChange={e => setLicenseFingerprint(e.target.value)}
                  className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Tenant Code Mapping</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC001"
                    value={licenseCompanyCode}
                    onChange={e => setLicenseCompanyCode(e.target.value)}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Status</label>
                  <select
                    value={licenseStatus}
                    onChange={e => setLicenseStatus(e.target.value as any)}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>
              </div>

              {/* ── Backend Infrastructure Section ───────────────────── */}
              <div className="border border-[var(--border-color)] rounded-xl p-4 bg-[var(--bg-primary)]">
                <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Server className="w-3 h-3 text-violet-400" /> Backend Infrastructure
                </p>

                {/* Toggle */}
                <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1 w-fit mb-4">
                  <button
                    type="button"
                    onClick={() => setLicenseBackendMode('self-hosted')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      licenseBackendMode === 'self-hosted'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Home className="w-3 h-3" /> Self-Hosted
                  </button>
                  <button
                    type="button"
                    onClick={() => setLicenseBackendMode('dev-managed')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      licenseBackendMode === 'dev-managed'
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Wrench className="w-3 h-3" /> Developer-Managed
                  </button>
                </div>

                {licenseBackendMode === 'self-hosted' ? (
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Self-Hosted Backend URL</label>
                    <input
                      type="url"
                      placeholder="e.g. http://192.168.1.10:5000 or https://erp.company.local"
                      value={licenseServerUrl}
                      onChange={e => setLicenseServerUrl(e.target.value)}
                      className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs font-mono"
                    />
                    <p className="text-[9px] text-[var(--text-muted)] mt-1">Will be auto-saved to Discovery registry on submit.</p>
                  </div>
                ) : (
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Select Developer Backend</label>
                    {devConfigs.length === 0 ? (
                      <p className="mt-2 text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                        ⚠ No dev configs available. Go to <strong>Infrastructure</strong> tab and add a developer backend first.
                      </p>
                    ) : (
                      <select
                        value={licenseDevConfigCode}
                        onChange={e => setLicenseDevConfigCode(e.target.value)}
                        className="w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-violet-500/50 py-2 px-3 rounded-lg text-xs"
                      >
                        <option value="">— Select a developer backend —</option>
                        {devConfigs.map(d => (
                          <option key={d.companyCode} value={d.companyCode}>
                            {d.companyCode} — {d.backendUrl} ({d.databaseType})
                          </option>
                        ))}
                      </select>
                    )}
                    {licenseDevConfigCode && (() => {
                      const sel = devConfigs.find(d => d.companyCode === licenseDevConfigCode);
                      return sel ? (
                        <div className="mt-2 text-[9px] text-[var(--text-muted)] bg-violet-500/5 border border-violet-500/15 rounded-lg p-2 space-y-0.5">
                          <p><span className="text-violet-300 font-bold">Backend:</span> {sel.backendUrl}</p>
                          <p><span className="text-violet-300 font-bold">DB:</span> {sel.databaseType} @ {sel.databaseHost || 'N/A'} / {sel.databaseName || 'N/A'}</p>
                          <p><span className="text-violet-300 font-bold">Managed by:</span> {sel.managedBy || '—'}</p>
                        </div>
                      ) : null;
                    })()}
                    <p className="text-[9px] text-[var(--text-muted)] mt-1">Discovery registry will be auto-synced to selected dev backend on submit.</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowLicenseModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingLicense ? 'Save Changes' : 'Issue Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISCOVERY MODAL */}
      {showDiscoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-scale-up text-left">
            <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              {editingDiscovery ? 'Edit DNS Mapping' : 'Provision DNS Node Mapping'}
            </h3>

            <form onSubmit={handleSaveDiscovery} className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC001"
                    disabled={!!editingDiscovery}
                    value={discoveryCompanyCode}
                    onChange={e => setDiscoveryCompanyCode(e.target.value)}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs font-mono uppercase disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Status</label>
                  <select
                    value={discoveryStatus}
                    onChange={e => setDiscoveryStatus(e.target.value as any)}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Industries Dev"
                  value={discoveryCompanyName}
                  onChange={e => setDiscoveryCompanyName(e.target.value)}
                  className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Node Instance serverUrl</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. http://localhost:5000"
                  value={discoveryServerUrl}
                  onChange={e => setDiscoveryServerUrl(e.target.value)}
                  className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowDiscoveryModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingDiscovery ? 'Save Changes' : 'Add Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEVELOPER CONFIG MODAL */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-hidden animate-scale-up text-left max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-violet-500" />
              {editingDev ? 'Edit Developer Backend Config' : 'Add Developer-Managed Backend'}
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-2 mb-4 bg-violet-500/5 border border-violet-500/15 rounded-lg p-2">
              For companies that don't self-host — configure the developer-managed backend here. Saving automatically updates the Discovery registry so clients route correctly.
            </p>

            <div className="flex items-center justify-between p-3 bg-violet-500/5 border border-violet-500/15 rounded-xl mb-4 text-xs">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="font-bold text-[var(--text-primary)]">Use Current Developer Infrastructure</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">Auto-configure using the active database and backend routing</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleCurrentDevInfra(!useCurrentDevInfra)}
                className={`w-10 h-6 rounded-full transition-all relative flex items-center p-0.5 cursor-pointer shrink-0 ${
                  useCurrentDevInfra ? 'bg-violet-600' : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow transition-all transform ${
                    useCurrentDevInfra ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <form onSubmit={handleSaveDevConfig} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingDev}
                    placeholder="e.g. ABC001"
                    value={devCompanyCode}
                    onChange={e => setDevCompanyCode(e.target.value.toUpperCase())}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-violet-500/50 py-2 px-3 rounded-lg text-xs font-mono uppercase disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Industries"
                    value={devCompanyName}
                    onChange={e => setDevCompanyName(e.target.value)}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-violet-500/50 py-2 px-3 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Developer Backend URL *</label>
                <input
                  type="url"
                  required
                  disabled={useCurrentDevInfra}
                  placeholder="e.g. https://erp.myserver.com or http://192.168.1.10:5000"
                  value={devBackendUrl}
                  onChange={e => setDevBackendUrl(e.target.value)}
                  className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-violet-500/50 py-2 px-3 rounded-lg text-xs font-mono disabled:opacity-50"
                />
                <p className="text-[9px] text-[var(--text-muted)] mt-1">This URL will be set in the Discovery registry so client apps connect here.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">DB Engine</label>
                  <select
                    disabled={useCurrentDevInfra}
                    value={devDatabaseType}
                    onChange={e => setDevDatabaseType(e.target.value)}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-violet-500/50 py-2 px-3 rounded-lg text-xs disabled:opacity-50"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="mariadb">MariaDB</option>
                    <option value="sqlite">SQLite</option>
                    <option value="mssql">MSSQL</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">DB Host</label>
                  <input
                    type="text"
                    disabled={useCurrentDevInfra}
                    placeholder="e.g. db.server.com"
                    value={devDatabaseHost}
                    onChange={e => setDevDatabaseHost(e.target.value)}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-violet-500/50 py-2 px-3 rounded-lg text-xs font-mono disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">DB Name</label>
                  <input
                    type="text"
                    disabled={useCurrentDevInfra}
                    placeholder="e.g. erp_abc"
                    value={devDatabaseName}
                    onChange={e => setDevDatabaseName(e.target.value)}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-violet-500/50 py-2 px-3 rounded-lg text-xs font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Managed By (Developer)</label>
                  <input
                    type="text"
                    disabled={useCurrentDevInfra}
                    placeholder="e.g. dev@yourcompany.com"
                    value={devManagedBy}
                    onChange={e => setDevManagedBy(e.target.value)}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-violet-500/50 py-2 px-3 rounded-lg text-xs disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Status</label>
                  <select
                    value={devStatus}
                    onChange={e => setDevStatus(e.target.value as any)}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-violet-500/50 py-2 px-3 rounded-lg text-xs"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Notes (Optional)</label>
                <textarea
                  rows={2}
                  disabled={useCurrentDevInfra}
                  placeholder="Any notes about this deployment..."
                  value={devNotes}
                  onChange={e => setDevNotes(e.target.value)}
                  className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-violet-500/50 py-2 px-3 rounded-lg text-xs disabled:opacity-50"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowDevModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingDev ? 'Save Changes' : 'Add & Sync Discovery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
