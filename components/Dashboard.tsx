import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell
} from 'recharts';
import { AnalysisResult, SaleItem } from '../types';
import { 
  TrendingUp, DollarSign, Receipt, Wallet, Percent, 
  LayoutDashboard, Scale, Activity, Trophy
} from 'lucide-react';

interface DashboardProps {
  data: AnalysisResult;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

// Custom Tooltip para corrigir problemas de cor (Dark/Light mode)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl ring-1 ring-black/5">
        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-1">{label}</p>
        <p className="text-blue-600 dark:text-blue-400 font-semibold">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'sales' | 'financial'>('sales');
  
  const salesStats = useMemo(() => {
    const totalGross = data.sales.reduce((acc, item) => acc + (item.value || 0), 0);
    const totalNet = data.sales.reduce((acc, item) => acc + (item.total || 0), 0);
    const totalDiscount = data.sales.reduce((acc, item) => acc + (item.discount || 0), 0);
    const totalOrders = data.sales.length;
    return { totalGross, totalNet, totalDiscount, totalOrders, averageTicket: totalOrders > 0 ? totalNet / totalOrders : 0 };
  }, [data.sales]);

  const paymentMethods = useMemo(() => {
    // Mapeia chaves seguras do objeto SaleItem
    const methods: { name: string; key: keyof SaleItem }[] = [
      { name: 'Dinheiro', key: 'paymentCash' },
      { name: 'Débito', key: 'paymentDebit' },
      { name: 'Crédito', key: 'paymentCredit' },
      { name: 'Faturado', key: 'paymentInvoiced' },
      { name: 'PIX/Transf', key: 'paymentBank' },
    ];

    return methods.map(m => {
      const total = data.sales.reduce((acc, item) => {
        const val = Number(item[m.key]) || 0;
        return acc + val;
      }, 0);
      return { name: m.name, value: total };
    }).filter(p => p.value > 0);
  }, [data.sales]);

  const topSales = useMemo(() => {
    // Ordena por valor total decrescente e pega os 5 primeiros
    return [...data.sales]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(sale => ({
        name: `Pedido #${sale.orderId}`,
        value: sale.total
      }));
  }, [data.sales]);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 pb-12 animate-fade-in text-slate-900 dark:text-slate-100 relative">
      
      <div className="flex justify-center mb-8">
        <div className="bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 inline-flex">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'sales' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <LayoutDashboard size={18} /> Análise de Vendas
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'financial' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Scale size={18} /> Fechamento de Caixa
          </button>
        </div>
      </div>

      {activeTab === 'sales' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="Faturamento Líquido" value={salesStats.totalNet} icon={DollarSign} color="blue" />
            <KpiCard title="Pedidos" value={salesStats.totalOrders} icon={Receipt} color="emerald" isCurrency={false} />
            <KpiCard title="Total Descontos" value={salesStats.totalDiscount} icon={Percent} color="red" />
            <KpiCard title="Ticket Médio" value={salesStats.averageTicket} icon={TrendingUp} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-500" /> Formas de Pagamento
              </h3>
              <div className="flex-1 w-full min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                  <BarChart data={paymentMethods} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(v) => `R$${v/1000}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                      {paymentMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> Top 5 Maiores Vendas
              </h3>
              <div className="flex-1 w-full min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                  <BarChart 
                    data={topSales} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={80} 
                      tick={{fill: '#94a3b8', fontSize: 11}} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                       {topSales.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#6366f1'} />
                       ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold">Detalhamento dos Pedidos</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="px-6 py-3">ID Pedido</th>
                    <th className="px-6 py-3 text-right">Valor</th>
                    <th className="px-6 py-3 text-right">Desconto</th>
                    <th className="px-6 py-3 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.sales.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-medium">{item.orderId}</td>
                      <td className="px-6 py-4 text-right">{formatCurrency(item.value)}</td>
                      <td className="px-6 py-4 text-right text-red-500">-{formatCurrency(item.discount || 0)}</td>
                      <td className="px-6 py-4 text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FinancialSummaryCard title="Receita Bruta" value={data.summary.grossRevenue} color="blue" />
            <FinancialSummaryCard title="Receita Líquida" value={data.summary.netRevenue} color="emerald" />
            <FinancialSummaryCard title="Saldo Final" value={data.summary.cashPosition} color="indigo" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl border border-slate-700">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Activity className="text-blue-400" /> Fluxo Analítico</h3>
              <div className="space-y-4">
                <FlowRow label="Recebimentos" value={data.summary.totalCashReceipts} type="pos" />
                <FlowRow label="Anteriores" value={data.summary.previousDebitReceipts} type="pos" />
                <FlowRow label="Suprimentos" value={data.summary.supplies?.reduce((a,b)=>a+b.value, 0) || 0} type="pos" />
                <FlowRow label="Retiradas" value={data.summary.withdrawals?.reduce((a,b)=>a+b.value, 0) || 0} type="neg" />
                <div className="pt-4 border-t border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-xl">Posição Final</span>
                  <span className="text-2xl font-black text-blue-400">{formatCurrency(data.summary.cashPosition)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-900">Vendas Faturadas</div>
              <div className="h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {data.summary.invoicedSales?.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-3 font-medium">{s.customerName || 'Cliente Geral'}</td>
                        <td className="px-6 py-3 text-right font-bold">{formatCurrency(s.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Assistant Chat removed for offline mode */}
      
    </div>
  );
};

const KpiCard = ({ title, value, icon: Icon, color, isCurrency = true }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black mt-1">{isCurrency ? formatCurrency(value) : value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colors[color]}`}><Icon size={24} /></div>
    </div>
  );
};

const FinancialSummaryCard = ({ title, value, color }: any) => {
  const borderColors: any = { blue: 'border-l-blue-500', emerald: 'border-l-emerald-500', indigo: 'border-l-indigo-500' };
  return (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 ${borderColors[color]} border-t border-r border-b border-slate-200 dark:border-slate-700`}>
      <p className="text-xs font-bold text-slate-500 uppercase">{title}</p>
      <h3 className="text-2xl font-black mt-1">{formatCurrency(value || 0)}</h3>
    </div>
  );
};

const FlowRow = ({ label, value, type }: any) => (
  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
    <span className="text-slate-400">{label}</span>
    <span className={`font-bold ${type === 'pos' ? 'text-emerald-400' : 'text-red-400'}`}>
      {type === 'pos' ? '+' : '-'} {formatCurrency(value)}
    </span>
  </div>
);