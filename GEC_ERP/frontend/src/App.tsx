import React, { useEffect, useState, lazy, Suspense } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { LoginSignup } from './components/auth/LoginSignup';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { UpdateEnforcementModal } from './components/common/UpdateEnforcementModal';
import { updaterService, UpdateInfo } from './services/updaterService';

// Module Components Lazy Loaded on Demand for Instant Startup (<0.4s)
const DashboardModule = lazy(() => import('./components/modules/DashboardModule').then(m => ({ default: m.DashboardModule })));
const ItemMasterModule = lazy(() => import('./components/modules/ItemMasterModule').then(m => ({ default: m.ItemMasterModule })));
const ProcessMasterModule = lazy(() => import('./components/modules/ProcessMasterModule').then(m => ({ default: m.ProcessMasterModule })));
const CustomerMasterModule = lazy(() => import('./components/modules/CustomerMasterModule').then(m => ({ default: m.CustomerMasterModule })));
const VendorMasterModule = lazy(() => import('./components/modules/VendorMasterModule').then(m => ({ default: m.VendorMasterModule })));
const BOMMasterModule = lazy(() => import('./components/modules/BOMMasterModule').then(m => ({ default: m.BOMMasterModule })));
const SalesOrderModule = lazy(() => import('./components/modules/SalesOrderModule').then(m => ({ default: m.SalesOrderModule })));
const InHouseInventoryModule = lazy(() => import('./components/modules/InHouseInventoryModule').then(m => ({ default: m.InHouseInventoryModule })));
const ExternalInventoryModule = lazy(() => import('./components/modules/ExternalInventoryModule').then(m => ({ default: m.ExternalInventoryModule })));
const InventoryModule = lazy(() => import('./components/modules/InventoryModule').then(m => ({ default: m.InventoryModule })));
const PurchaseOrderModule = lazy(() => import('./components/modules/PurchaseOrderModule').then(m => ({ default: m.PurchaseOrderModule })));
const GRNModule = lazy(() => import('./components/modules/GRNModule').then(m => ({ default: m.GRNModule })));
const WorkOrderModule = lazy(() => import('./components/modules/WorkOrderModule').then(m => ({ default: m.WorkOrderModule })));
const QualityControlModule = lazy(() => import('./components/modules/QualityControlModule').then(m => ({ default: m.QualityControlModule })));
const AssemblyModule = lazy(() => import('./components/modules/AssemblyModule').then(m => ({ default: m.AssemblyModule })));
const UserManagementModule = lazy(() => import('./components/modules/UserManagementModule').then(m => ({ default: m.UserManagementModule })));
const ShortageModule = lazy(() => import('./components/modules/ShortageModule').then(m => ({ default: m.ShortageModule })));
const JobCardModule = lazy(() => import('./components/modules/JobCardModule').then(m => ({ default: m.JobCardModule })));
const FloorPlanningModule = lazy(() => import('./components/modules/FloorPlanningModule').then(m => ({ default: m.FloorPlanningModule })));
const DispatchModule = lazy(() => import('./components/modules/DispatchModule').then(m => ({ default: m.DispatchModule })));
const PlanningModule = lazy(() => import('./components/modules/PlanningModule').then(m => ({ default: m.PlanningModule })));
const SuperAdminAnalyticsModule = lazy(() => import('./components/modules/SuperAdminAnalyticsModule').then(m => ({ default: m.SuperAdminAnalyticsModule })));
const MaterialIssueModule = lazy(() => import('./components/modules/MaterialIssueModule').then(m => ({ default: m.MaterialIssueModule })));
const QuotationModule = lazy(() => import('./components/modules/QuotationModule').then(m => ({ default: m.QuotationModule })));
const DrawingsModule = lazy(() => import('./components/modules/DrawingsModule').then(m => ({ default: m.DrawingsModule })));

const ModuleLoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '320px', gap: '0.75rem', color: 'var(--text-muted)' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Loading Module...</span>
  </div>
);

const MODULE_REGISTRY: Record<string, React.LazyExoticComponent<React.FC<any>> | React.FC<any>> = {
  'superadmin-analytics': SuperAdminAnalyticsModule,
  'dashboard': DashboardModule,
  'quotations': QuotationModule,
  'planning': PlanningModule,
  'shortage': ShortageModule,
  'item-master': ItemMasterModule,
  'drawings': DrawingsModule,
  'process-master': ProcessMasterModule,
  'customer-master': CustomerMasterModule,
  'vendor-master': VendorMasterModule,
  'bom-master': BOMMasterModule,
  'sales-orders': SalesOrderModule,
  'work-orders': WorkOrderModule,
  'job-cards': JobCardModule,
  'material-issue': MaterialIssueModule,
  'floor-planning': FloorPlanningModule,
  'inventory': InventoryModule,
  'inhouse-inventory': InHouseInventoryModule,
  'external-inventory': ExternalInventoryModule,
  'external-jobwork': ExternalInventoryModule,
  'jobwork': ExternalInventoryModule,
  'purchase-orders': PurchaseOrderModule,
  'grn': GRNModule,
  'quality-control': QualityControlModule,
  'dispatch': DispatchModule,
  'assembly': AssemblyModule,
  'user-management': UserManagementModule,
};

const MainContent: React.FC = () => {
  const { currentUser, activeModule, setActiveModule } = useERP();
  const [pendingUpdate, setPendingUpdate] = useState<UpdateInfo | null>(null);

  const isSuperAdminUser = currentUser?.isSuperAdmin === true || currentUser?.username?.toLowerCase() === 'superadmin';
  const effectiveModule = activeModule || (isSuperAdminUser ? 'superadmin-analytics' : 'dashboard');

  // Keep-Alive Module Caching: visited modules stay mounted in DOM for 0ms instant tab switching
  const [visitedModules, setVisitedModules] = useState<string[]>(() => [effectiveModule]);

  // Track active modules unconditionally
  useEffect(() => {
    if (currentUser && effectiveModule) {
      setVisitedModules(prev => prev.includes(effectiveModule) ? prev : [...prev, effectiveModule]);
    }
  }, [currentUser, effectiveModule]);

  // Initialize heartbeat and check for updates on startup/login
  useEffect(() => {
    updaterService.setOnUpdateAvailable((info) => {
      setPendingUpdate(info);
    });

    if (currentUser) {
      updaterService.startHeartbeat(currentUser);
      updaterService.checkForUpdates();
    } else {
      updaterService.stopHeartbeat();
      updaterService.checkForUpdates();
    }

    return () => {
      updaterService.stopHeartbeat();
    };
  }, [currentUser]);

  // Global ESC Key Navigation System: Closes in-screen forms/modals first, then returns to Dashboard
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Priority 1: Check if any back/close button with '(ESC)' tag exists in DOM and trigger it
        const allButtons = Array.from(document.querySelectorAll('button'));
        const escBtn = allButtons.find(b => b.textContent && b.textContent.includes('(ESC)'));
        if (escBtn) {
          (escBtn as HTMLButtonElement).click();
          return;
        }

        // Priority 2: Check if any modal dialog overlay is currently visible in DOM
        const openModalOverlay = document.querySelector('.modal-overlay');
        if (openModalOverlay) {
          const closeBtn = openModalOverlay.querySelector('button') as HTMLButtonElement | null;
          if (closeBtn) {
            closeBtn.click();
            return;
          }
        }

        // Priority 3: If no active form/modal is open, navigate back to Dashboard
        const homeModule = isSuperAdminUser ? 'superadmin-analytics' : 'dashboard';
        if (activeModule !== homeModule) {
          setActiveModule(homeModule);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeModule, setActiveModule, isSuperAdminUser]);

  // Disable scroll wheel increment/decrement on all number inputs globally
  useEffect(() => {
    const handleWheel = () => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type === 'number') {
        activeEl.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  if (!currentUser) {
    return (
      <>
        {pendingUpdate && pendingUpdate.updateAvailable && (
          <UpdateEnforcementModal updateInfo={pendingUpdate} />
        )}
        <LoginSignup />
      </>
    );
  }

  return (
    <div className="app-container">
      {/* Mandatory Update Enforcement Modal */}
      {pendingUpdate && pendingUpdate.updateAvailable && (
        <UpdateEnforcementModal updateInfo={pendingUpdate} />
      )}

      {/* Fixed Left Side Navigation Panel - Permanent */}
      <Sidebar />

      {/* Main Right Content Area */}
      <div className="main-content-wrapper">
        <Header />
        <main className="page-body animate-fade-in">
          {visitedModules.map(modKey => {
            const Component = MODULE_REGISTRY[modKey] || (isSuperAdminUser ? SuperAdminAnalyticsModule : DashboardModule);
            const isVisible = effectiveModule === modKey;
            return (
              <div
                key={modKey}
                style={{
                  display: isVisible ? 'flex' : 'none',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                  height: '100%',
                  width: '100%'
                }}
              >
                <Suspense fallback={<ModuleLoadingFallback />}>
                  <Component />
                </Suspense>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ERPProvider>
      <MainContent />
    </ERPProvider>
  );
}

export default App;
