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
        
        <div className="border-t border-[var(--border-color)] pt-4 mt-2">
          <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block mb-3">SMTP Mail Integration (Simulated Gate)</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block">SMTP Relaying Host</label>
              <input
                type="text"
                placeholder="smtp.example.com"
                value={adminProfileForm.smtpHost}
                onChange={e => setAdminProfileForm({ ...adminProfileForm, smtpHost: e.target.value })}
                className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-lg text-[10px]"
              />
            </div>
            <div>
              <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider block">SMTP Port</label>
              <input
                type="text"
                placeholder="587"
                value={adminProfileForm.smtpPort}
                onChange={e => setAdminProfileForm({ ...adminProfileForm, smtpPort: e.target.value })}
                className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-lg text-[10px]"
              />
            </div>
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
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-md shadow-indigo-600/10 transition-colors border-0"
          >
            {loading ? 'Saving...' : 'Save Workspace Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
