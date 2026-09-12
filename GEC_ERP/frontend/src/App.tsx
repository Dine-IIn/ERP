import React, { useEffect } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { LoginSignup } from './components/auth/LoginSignup';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardModule } from './components/modules/DashboardModule';
import { ItemMasterModule } from './components/modules/ItemMasterModule';
import { ProcessMasterModule } from './components/modules/ProcessMasterModule';
import { CustomerMasterModule } from './components/modules/CustomerMasterModule';
import { VendorMasterModule } from './components/modules/VendorMasterModule';
import { BOMMasterModule } from './components/modules/BOMMasterModule';
import { SalesOrderModule } from './components/modules/SalesOrderModule';
import { InHouseInventoryModule } from './components/modules/InHouseInventoryModule';
import { ExternalInventoryModule } from './components/modules/ExternalInventoryModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { PurchaseOrderModule } from './components/modules/PurchaseOrderModule';
import { GRNModule } from './components/modules/GRNModule';
import { WorkOrderModule } from './components/modules/WorkOrderModule';
import { QualityControlModule } from './components/modules/QualityControlModule';
import { AssemblyModule } from './components/modules/AssemblyModule';
import { UserManagementModule } from './components/modules/UserManagementModule';
import { ShortageModule } from './components/modules/ShortageModule';
import { JobCardModule } from './components/modules/JobCardModule';
import { FloorPlanningModule } from './components/modules/FloorPlanningModule';
import { DispatchModule } from './components/modules/DispatchModule';
import { PlanningModule } from './components/modules/PlanningModule';
import { SuperAdminAnalyticsModule } from './components/modules/SuperAdminAnalyticsModule';

const MainContent: React.FC = () => {
  const { currentUser, activeModule, setActiveModule } = useERP();

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
        const isSuperAdminUser = currentUser?.isSuperAdmin === true || currentUser?.username?.toLowerCase() === 'superadmin';
        const homeModule = isSuperAdminUser ? 'superadmin-analytics' : 'dashboard';
        if (activeModule !== homeModule) {
          setActiveModule(homeModule);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeModule, setActiveModule, currentUser]);

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
    return <LoginSignup />;
  }

  const isSuperAdminUser = currentUser?.isSuperAdmin === true || currentUser?.username?.toLowerCase() === 'superadmin';

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'superadmin-analytics': return <SuperAdminAnalyticsModule />;
      case 'dashboard': return <DashboardModule />;
      case 'planning': return <PlanningModule />;
      case 'shortage': return <ShortageModule />;
      case 'item-master': return <ItemMasterModule />;
      case 'process-master': return <ProcessMasterModule />;
      case 'customer-master': return <CustomerMasterModule />;
      case 'vendor-master': return <VendorMasterModule />;
      case 'bom-master': return <BOMMasterModule />;
      case 'sales-orders': return <SalesOrderModule />;
      case 'work-orders': return <WorkOrderModule />;
      case 'job-cards': return <JobCardModule />;
      case 'floor-planning': return <FloorPlanningModule />;
      case 'inventory': return <InventoryModule />;
      case 'inhouse-inventory': return <InventoryModule />;
      case 'external-inventory': return <InventoryModule />;
      case 'external-jobwork': return <ExternalInventoryModule />;
      case 'jobwork': return <ExternalInventoryModule />;
      case 'purchase-orders': return <PurchaseOrderModule />;
      case 'grn': return <GRNModule />;
      case 'quality-control': return <QualityControlModule />;
      case 'dispatch': return <DispatchModule />;
      case 'assembly': return <AssemblyModule />;
      case 'user-management': return <UserManagementModule />;
      default: return isSuperAdminUser ? <SuperAdminAnalyticsModule /> : <DashboardModule />;
    }
  };

  return (
    <div className="app-container">
      {/* Fixed Left Side Navigation Panel - Permanent */}
      <Sidebar />

      {/* Main Right Content Area */}
      <div className="main-content-wrapper">
        <Header />
        <main className="page-body animate-fade-in">
          {renderActiveModule()}
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
