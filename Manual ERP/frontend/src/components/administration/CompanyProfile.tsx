import React from 'react';
import { Building } from 'lucide-react';

interface CompanyProfileProps {
  adminProfileForm: {
    legalCompanyName: string;
    companyEmail: string;
    companyPhone: string;
    website: string;
    industryType: string;
    businessType: string;
    gstin: string;
    pan: string;
    country: string;
    state: string;
    city: string;
    addressLine1: string;
    primaryColor: string;
    secondaryColor: string;
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPassword: string;
    currencyId?: string;
  };
  setAdminProfileForm: React.Dispatch<React.SetStateAction<any>>;
  handleUpdateAdminProfileSubmit: (e: React.FormEvent) => Promise<void>;
  loading?: boolean;
}

export default function CompanyProfile({
  adminProfileForm,
  setAdminProfileForm,
  handleUpdateAdminProfileSubmit,
  loading = false,
}: CompanyProfileProps) {
  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 font-display flex items-center gap-1.5 uppercase tracking-wide">
        <Building className="w-4 h-4 text-indigo-400" /> General Company Workspace Registry
      </h3>
      
      <form onSubmit={handleUpdateAdminProfileSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Legal Registered Name</label>
            <input
              type="text"
              required
              placeholder="Legal Registered Name"
              value={adminProfileForm.legalCompanyName}
              onChange={e => setAdminProfileForm({ ...adminProfileForm, legalCompanyName: e.target.value })}
              className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 px-3 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Official Company Email</label>
            <input
              type="email"
              required
              placeholder="e.g. contact@company.com"
              value={adminProfileForm.companyEmail}
              onChange={e => setAdminProfileForm({ ...adminProfileForm, companyEmail: e.target.value })}
              className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 px-3 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Phone Number</label>
            <input
              type="text"
              required
              placeholder="+919876543210"
              value={adminProfileForm.companyPhone}
              onChange={e => setAdminProfileForm({ ...adminProfileForm, companyPhone: e.target.value })}
              className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 px-3 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Website URL</label>
            <input
              type="text"
              placeholder="e.g. www.company.com"
              value={adminProfileForm.website}
              onChange={e => setAdminProfileForm({ ...adminProfileForm, website: e.target.value })}
              className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 px-3 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Industry Sector Type</label>
            <input
              type="text"
              placeholder="e.g. Manufacturing, Retail"
              value={adminProfileForm.industryType}
              onChange={e => setAdminProfileForm({ ...adminProfileForm, industryType: e.target.value })}
              className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 px-3 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Preferred Corporate Currency</label>
            <select
              value={adminProfileForm.currencyId || 'USD'}
              onChange={e => setAdminProfileForm({ ...adminProfileForm, currencyId: e.target.value })}
              className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 px-3 rounded-lg text-xs cursor-pointer text-[var(--text-primary)]"
            >
              <option value="USD">USD ($ - United States Dollar)</option>
              <option value="INR">INR (₹ - Indian Rupee)</option>
              <option value="EUR">EUR (€ - Euro)</option>
              <option value="GBP">GBP (£ - British Pound)</option>
              <option value="AED">AED (د.إ - UAE Dirham)</option>
              <option value="CAD">CAD (C$ - Canadian Dollar)</option>
              <option value="AUD">AUD (A$ - Australian Dollar)</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">GSTIN / PAN Tax Registry</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input
                type="text"
                placeholder="GSTIN"
                value={adminProfileForm.gstin}
                onChange={e => setAdminProfileForm({ ...adminProfileForm, gstin: e.target.value })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-[10px]"
              />
              <input
                type="text"
                placeholder="PAN"
                value={adminProfileForm.pan}
                onChange={e => setAdminProfileForm({ ...adminProfileForm, pan: e.target.value })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-[10px]"
              />
            </div>
          </div>
        </div>
        
        <div className="border-t border-[var(--border-color)]/50 pt-3 mt-1">
          <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block mb-3">Corporate Address Details</span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Address Line 1</label>
              <input
                type="text"
                placeholder="Address Line 1"
                value={adminProfileForm.addressLine1 || ''}
                onChange={e => setAdminProfileForm({ ...adminProfileForm, addressLine1: e.target.value })}
                className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 px-3 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">City</label>
              <input
                type="text"
                placeholder="City"
                value={adminProfileForm.city || ''}
                onChange={e => setAdminProfileForm({ ...adminProfileForm, city: e.target.value })}
                className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 px-3 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">State</label>
              <input
                type="text"
                placeholder="State (e.g. Gujarat)"
                value={adminProfileForm.state || ''}
                onChange={e => setAdminProfileForm({ ...adminProfileForm, state: e.target.value })}
                className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 px-3 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Country</label>
              <input
                type="text"
                placeholder="Country (e.g. India)"
                value={adminProfileForm.country || ''}
                onChange={e => setAdminProfileForm({ ...adminProfileForm, country: e.target.value })}
                className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 px-3 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>
        
        <div className="border-t border-[var(--border-color)] pt-4 mt-2">
          <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block mb-3">SMTP Mail Integration (Simulated Gate)</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block">SMTP Authentication User</label>
              <input
                type="text"
                placeholder="user@example.com"
                value={adminProfileForm.smtpUser}
                onChange={e => setAdminProfileForm({ ...adminProfileForm, smtpUser: e.target.value })}
                className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-lg text-[10px]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block">SMTP Security Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={adminProfileForm.smtpPassword}
                onChange={e => setAdminProfileForm({ ...adminProfileForm, smtpPassword: e.target.value })}
                className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-lg text-[10px]"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--border-color)]/50">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-md shadow-indigo-600/10 transition-colors border-0 flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Workspace Changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
