import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getCompany, getDashboardMetrics, getProducts, getSalesOrders } from "@/lib/api";

export default async function Home() {
  const [company, metrics, products, orders] = await Promise.all([
    getCompany(),
    getDashboardMetrics(),
    getProducts(),
    getSalesOrders()
  ]);

  return (
    <AppShell company={company}>
      <div className="space-y-5 p-6 max-sm:p-4">
        <section className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-md border border-line bg-white p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{metric.label}</p>
                <ArrowUpRight className={metric.trend === "up" ? "text-accent" : "text-slate-400"} size={17} />
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-normal">{metric.value}</div>
              <p className="mt-1 text-xs text-slate-500">{metric.helper}</p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-[1.3fr_0.7fr] gap-4 max-xl:grid-cols-1">
          <div className="rounded-md border border-line bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h1 className="text-base font-semibold">Sales Orders</h1>
                <p className="text-xs text-slate-500">Live order pipeline and approval state</p>
              </div>
              <Activity size={18} className="text-brand" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead className="bg-panel text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-line">
                      <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{order.customerName}</td>
                      <td className="px-4 py-3 text-slate-600">{order.orderDate}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">{order.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">₹{order.totalAmount.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-md border border-line bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">Stock Watch</h2>
                <p className="text-xs text-slate-500">Availability after reservations</p>
              </div>
              <AlertTriangle size={18} className="text-warn" />
            </div>
            <div className="divide-y divide-line">
              {products.map((product) => {
                const available = product.stockOnHand - product.reservedQty;
                const isRisk = available <= product.minStockLevel;
                return (
                  <div key={product.id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{product.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{product.code}</div>
                    </div>
                    <div className="text-right">
                      <div className={isRisk ? "text-sm font-semibold text-warn" : "text-sm font-semibold text-accent"}>{available}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <CheckCircle2 size={13} />
                        available
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
