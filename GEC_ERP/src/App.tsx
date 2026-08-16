import React, { useEffect } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { LoginSignup } from './components/auth/LoginSignup';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardModule } from './components/modules/DashboardModule';
import { ItemMasterModule } from './components/modules/ItemMasterModule';
import { CustomerMasterModule } from './components/modules/CustomerMasterModule';
import { VendorMasterModule } from './components/modules/VendorMasterModule';
import { BOMMasterModule } from './components/modules/BOMMasterModule';
import { SalesOrderModule } from './components/modules/SalesOrderModule';
import { InHouseInventoryModule } from './components/modules/InHouseInventoryModule';
import { ExternalInventoryModule } from './components/modules/ExternalInventoryModule';
import { PurchaseOrderModule } from './components/modules/PurchaseOrderModule';
import { GRNModule } from './components/modules/GRNModule';
import { WorkOrderModule } from './components/modules/WorkOrderModule';
import { QualityControlModule } from './components/modules/QualityControlModule';
import { AssemblyModule } from './components/modules/AssemblyModule';
import { MRPPlanningModule } from './components/modules/MRPPlanningModule';

const MainContent: React.FC = () => {
  const { currentUser, activeModule, setActiveModule } = useERP();

  // Global ESC Key Listener: Closes open forms/modals first, then returns to Dashboard
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Check if any modal dialog overlay is currently visible in DOM
        const openModalOverlay = document.querySelector('.modal-overlay');
        if (openModalOverlay) {
          const closeBtn = openModalOverlay.querySelector('button') as HTMLButtonElement | null;
          if (closeBtn) {
            closeBtn.click();
            return;
          }
        }

        // If no modal is open, return to Dashboard
        if (activeModule !== 'dashboard') {
          setActiveModule('dashboard');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeModule, setActiveModule]);

  if (!currentUser) {
    return <LoginSignup />;
  }

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard': return <DashboardModule />;
      case 'item-master': return <ItemMasterModule />;
      case 'customer-master': return <CustomerMasterModule />;
      case 'vendor-master': return <VendorMasterModule />;
      case 'bom-master': return <BOMMasterModule />;
      case 'sales-orders': return <SalesOrderModule />;
      case 'inhouse-inventory': return <InHouseInventoryModule />;
      case 'external-inventory': return <ExternalInventoryModule />;
      case 'purchase-orders': return <PurchaseOrderModule />;
      case 'grn': return <GRNModule />;
      case 'work-orders': return <WorkOrderModule />;
      case 'quality-control': return <QualityControlModule />;
      case 'assembly': return <AssemblyModule />;
      case 'mrp-planning': return <MRPPlanningModule />;
      default: return <DashboardModule />;
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
