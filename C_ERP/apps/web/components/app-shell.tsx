import { BarChart3, Boxes, Building2, CircleDollarSign, ClipboardList, Factory, FileBarChart, LayoutDashboard, PackageCheck, Settings, Truck, Users } from "lucide-react";
import type { CompanySummary } from "@nexaerp/shared-types";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Inventory", icon: Boxes },
  { label: "Sales", icon: ClipboardList },
  { label: "Purchase", icon: PackageCheck },
  { label: "Warehouse", icon: Truck },
  { label: "Manufacturing", icon: Factory },
  { label: "Accounts", icon: CircleDollarSign },
  { label: "HR", icon: Users },
  { label: "Reports", icon: FileBarChart },
  { label: "Settings", icon: Settings }
];

export function AppShell({ company, children }: Readonly<{ company: CompanySummary; children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen grid-cols-[248px_1fr] bg-[#eef2f7] text-ink max-lg:grid-cols-1">
      <aside className="border-r border-line bg-white max-lg:hidden">
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <div className="flex size-9 items-center justify-center rounded-md bg-brand text-white">
            <Building2 size={19} />
          </div>
          <div>
            <div className="text-sm font-semibold">NexaERP</div>
            <div className="text-xs text-slate-500">{company.plan} plan</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navigation.map((item) => (
            <NavButton key={item.label} item={item} />
          ))}
        </nav>
      </aside>
      <section className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-line bg-white px-6 max-sm:h-auto max-sm:flex-col max-sm:items-start max-sm:gap-3 max-sm:px-4 max-sm:py-3">
          <div>
            <div className="text-sm font-semibold">{company.name}</div>
            <div className="text-xs text-slate-500">Tenant: {company.slug} · {company.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-9 rounded-md border border-line px-3 text-sm font-medium text-slate-700" type="button">
              Export
            </button>
            <button className="h-9 rounded-md bg-brand px-3 text-sm font-medium text-white" type="button">
              New Order
            </button>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

function NavButton({ item }: Readonly<{ item: (typeof navigation)[number] }>) {
  const Icon = item.icon;

  return (
    <button
      className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm ${
        item.active ? "bg-blue-50 font-medium text-brand" : "text-slate-600 hover:bg-slate-100"
      }`}
      type="button"
      title={item.label}
    >
      <Icon size={17} />
      <span>{item.label}</span>
    </button>
  );
}
