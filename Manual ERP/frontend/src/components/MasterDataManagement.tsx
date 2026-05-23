import { useState } from 'react';
import {
  Package,
  Users,
  Truck,
  UserCircle,
  Warehouse,
  Receipt,
  Tag
} from 'lucide-react';

import ProductMasterUI from './masters/ProductMasterUI';
import CustomerMasterUI from './masters/CustomerMasterUI';
import VendorMasterUI from './masters/VendorMasterUI';
import EmployeeMasterUI from './masters/EmployeeMasterUI';
import WarehouseMasterUI from './masters/WarehouseMasterUI';
import FinanceMastersUI from './masters/FinanceMastersUI';
import ClassificationMastersUI from './masters/ClassificationMastersUI';

interface MDMProps {
  user: any;
  token: string;
  backendUrl: string;
  initialMaster?: string;
}

export default function MasterDataManagement({ token, backendUrl, initialMaster }: MDMProps) {
  const [activeModule, setActiveModule] = useState(initialMaster || 'product');

  const navItems = [
    { id: 'product', label: 'Product Master', icon: <Package className="w-4 h-4" />, color: 'indigo' },
    { id: 'customer', label: 'Customer Master', icon: <Users className="w-4 h-4" />, color: 'emerald' },
    { id: 'vendor', label: 'Vendor Master', icon: <Truck className="w-4 h-4" />, color: 'amber' },
    { id: 'employee', label: 'Employee Master', icon: <UserCircle className="w-4 h-4" />, color: 'purple' },
    { id: 'warehouse', label: 'Warehouse Master', icon: <Warehouse className="w-4 h-4" />, color: 'cyan' },
    { id: 'finance', label: 'Finance & Tax', icon: <Receipt className="w-4 h-4" />, color: 'rose' },
    { id: 'classification', label: 'Classifications', icon: <Tag className="w-4 h-4" />, color: 'orange' }
  ];

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'product': return <ProductMasterUI token={token} backendUrl={backendUrl} />;
      case 'customer': return <CustomerMasterUI token={token} backendUrl={backendUrl} />;
      case 'vendor': return <VendorMasterUI token={token} backendUrl={backendUrl} />;
      case 'employee': return <EmployeeMasterUI token={token} backendUrl={backendUrl} />;
      case 'warehouse': return <WarehouseMasterUI token={token} backendUrl={backendUrl} />;
      case 'finance': return <FinanceMastersUI token={token} backendUrl={backendUrl} />;
      case 'classification': return <ClassificationMastersUI token={token} backendUrl={backendUrl} />;
      default: return <ProductMasterUI token={token} backendUrl={backendUrl} />;
    }
  };

  const COLOR_MAP: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  };

  return (
    <div className="flex h-full w-full bg-[var(--bg-primary)] overflow-hidden">
      {/* Sidebar / Sub-navigation */}
      <div className="w-64 border-r border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col">
        <div className="p-4 border-b border-[var(--border-color)]">
          <h2 className="font-extrabold text-[var(--text-primary)] font-display text-sm tracking-wide">MASTER DATA</h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Enterprise Configuration Hub</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(item => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all cursor-pointer group ${
                  isActive 
                    ? `${COLOR_MAP[item.color]} font-bold border` 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`}>
                  {item.icon}
                </div>
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[var(--bg-primary)] overflow-hidden flex flex-col p-6">
        {renderActiveModule()}
      </div>
    </div>
  );
}
