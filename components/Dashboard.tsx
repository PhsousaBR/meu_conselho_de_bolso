"use client";

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getIncomes, getExpenses, getGoals, getCampaigns } from '../services/dataService';
import { Income, Expense, Goal, IncomeStatus, Campaign } from '../types';
import { MONTH_NAMES, ICONS } from '../constants';
import Link from 'next/link';

const Dashboard: React.FC = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inc, exp, cmp] = await Promise.all([getIncomes(), getExpenses(), getCampaigns()]);
        const now = new Date();
        const goal = await getGoals(now.getFullYear()).then(goals => goals.find(g => g.month === now.getMonth() + 1) || null);
        
        setIncomes(inc);
        setExpenses(exp);
        setCampaigns(cmp);
        setCurrentGoal(goal);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando painel...</div>;

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const daysPassed = now.getDate();
  const monthName = MONTH_NAMES[currentMonthIdx];

  // Metrics
  const thisMonthIncomes = incomes.filter(i => {
    const d = new Date(i.date);
    return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
  });
  
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
  });

  // UPDATED: Use net_amount if available, fallback to amount
  const getAmount = (i: Income) => i.net_amount !== undefined ? Number(i.net_amount) : Number(i.amount);

  const totalIncome = thisMonthIncomes
    .filter(i => i.status === IncomeStatus.RECEIVED)
    .reduce((acc, curr) => acc + getAmount(curr), 0);
  
  const pendingIncome = thisMonthIncomes
    .filter(i => i.status === IncomeStatus.PENDING)
    .reduce((acc, curr) => acc + getAmount(curr), 0);

  const totalExpenses = thisMonthExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const balance = totalIncome - totalExpenses;

  // --- COMPASS LOGIC ---
  const goalTarget = currentGoal?.target_amount || 0;
  const goalProgressPct = goalTarget > 0 ? Math.min((totalIncome / goalTarget) * 100, 100) : 0;
  const goalRemaining = Math.max(goalTarget - totalIncome, 0);
  const dailyPaceNeeded = goalRemaining / (daysInMonth - daysPassed + 1); // Amount needed per day for rest of month

  // --- FUTURE CASH FLOW (90 Days) ---
  const futureCutoff = new Date();
  futureCutoff.setDate(futureCutoff.getDate() + 90);
  
  const pendingNext90 = incomes
    .filter(i => i.status === IncomeStatus.PENDING && new Date(i.date) >= now && new Date(i.date) <= futureCutoff)
    .reduce((acc, curr) => acc + getAmount(curr), 0);

  const pendingNext90Count = incomes
    .filter(i => i.status === IncomeStatus.PENDING && new Date(i.date) >= now && new Date(i.date) <= futureCutoff)
    .length;


  // --- ACTION CENTER LOGIC ---
  const actions: { type: 'alert' | 'warning' | 'good' | 'info', text: string, link: string, value?: string }[] = [];
  
  // 1. Marketing Insights (Priority)
  const activeCampaigns = campaigns.filter(c => !c.end_date || new Date(c.end_date) >= now);
  
  if (activeCampaigns.length > 0) {
      activeCampaigns.forEach(c => {
          const attributedRevenue = incomes
            .filter(i => i.campaign_id === c.id && i.status === IncomeStatus.RECEIVED)
            .reduce((acc, curr) => acc + getAmount(curr), 0);
          
          const roas = c.spend > 0 ? attributedRevenue / c.spend : 0;
          const customersAcquired = incomes.filter(i => i.campaign_id === c.id && i.customer_acquired).length;
          const cac = customersAcquired > 0 ? c.spend / customersAcquired : 0;

          // High Spend, Zero Return
          if (c.spend > 500 && attributedRevenue === 0) {
              actions.push({
                  type: 'alert',
                  text: `A campanha "${c.name}" gastou R$ ${c.spend} sem retorno. Revise urgentemente.`,
                  link: '/marketing'
              });
          }
          // High ROAS (Scaling Opportunity)
          else if (roas > 5) {
               actions.push({
                  type: 'good',
                  text: `Oportunidade: "${c.name}" tem ROAS excelente (${roas.toFixed(1)}x). Considere aumentar o orçamento.`,
                  link: '/marketing',
                  value: `ROAS ${roas.toFixed(1)}x`
              });
          }
          // Low ROAS
          else if (c.spend > 200 && roas < 1.5) {
              actions.push({
                  type: 'warning',
                  text: `Desempenho baixo em "${c.name}". O retorno está cobrindo pouco o investimento.`,
                  link: '/marketing',
                  value: `ROAS ${roas.toFixed(1)}x`
              });
          }
          // High CAC Alert
          if (cac > 200 && customersAcquired > 0) {
               actions.push({
                  type: 'warning',
                  text: `Custo por cliente alto na campanha "${c.name}".`,
                  link: '/marketing',
                  value: `CAC R$ ${cac.toFixed(0)}`
              });
          }
      });
  } else {
       actions.push({ type: 'info', text: 'Sem campanhas ativas. O marketing é o motor do crescimento.', link: '/marketing' });
  }

  // 2. Pending Income
  if (pendingIncome > 0) {
      actions.push({
          type: 'warning',
          text: `Você tem valores pendentes para receber este mês.`,
          link: '/receitas',
          value: `R$ ${pendingIncome.toLocaleString('pt-BR')}`
      });
  }

  // 3. Goal Pace
  if (goalTarget > 0) {
      const idealPacePct = (daysPassed / daysInMonth) * 100;
      if (totalIncome < goalTarget && goalProgressPct < idealPacePct - 15) {
           actions.push({
              type: 'alert',
              text: `Ritmo de vendas lento. Faltam R$ ${goalRemaining.toLocaleString('pt-BR')} para a meta.`,
              link: '/metas'
          });
      } else if (totalIncome >= goalTarget) {
           actions.push({
              type: 'good',
              text: 'Meta do mês batida! Tudo o que entrar agora é lucro extra.',
              link: '/metas'
          });
      }
  } else {
      actions.push({ type: 'info', text: 'Defina uma meta para ativar a Bússola Financeira.', link: '/metas' });
  }

  // Chart Data (Last 12 Months)
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const month = d.getMonth();
    const year = d.getFullYear();
    const label = `${MONTH_NAMES[month]}/${year.toString().slice(2)}`;

    const monthlyIncome = incomes
      .filter(inc => {
        const idate = new Date(inc.date);
        return idate.getMonth() === month && idate.getFullYear() === year && inc.status === IncomeStatus.RECEIVED;
      })
      .reduce((sum, inc) => sum + getAmount(inc), 0);

    return { name: label, value: monthlyIncome };
  });

  return (
    <div className="space-y-6 text-slate-900">
      <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
      
      {/* COMPASS WIDGET (Bússola) */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"></path></svg>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="w-full md:w-1/2">
                <div className="flex items-center gap-2 mb-2 text-indigo-300 uppercase text-xs font-bold tracking-wider">
                    <ICONS.Check /> Bússola Financeira &bull; {monthName}/{currentYear}
                </div>
                <h2 className="text-4xl font-bold mb-1">
                    R$ {totalIncome.toLocaleString('pt-BR')}
                </h2>
                <p className="text-slate-400 text-sm">Realizado até agora (Líquido)</p>
                
                <div className="mt-6">
                    <div className="flex justify-between text-xs mb-1 font-medium">
                        <span className={goalProgressPct >= 100 ? "text-emerald-400" : "text-white"}>
                            {goalProgressPct.toFixed(0)}% da Meta
                        </span>
                        <span className="text-slate-400">Objetivo: R$ {goalTarget.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                                goalProgressPct >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : 
                                goalProgressPct > 70 ? 'bg-gradient-to-r from-indigo-500 to-indigo-300' : 
                                'bg-gradient-to-r from-amber-500 to-amber-300'
                            }`} 
                            style={{ width: `${goalProgressPct}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-auto bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 min-w-[200px]">
                {goalTarget > 0 ? (
                    totalIncome >= goalTarget ? (
                         <div>
                            <p className="text-emerald-400 font-bold text-lg mb-1">Meta Batida! 🚀</p>
                            <p className="text-xs text-slate-300">Você superou o objetivo do mês.</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-slate-300 uppercase font-bold mb-1">Para atingir o objetivo:</p>
                            <p className="text-2xl font-bold text-white mb-1">R$ {goalRemaining.toLocaleString('pt-BR')}</p>
                            <p className="text-xs text-slate-400">
                                Falta vender aprox. <strong>R$ {dailyPaceNeeded > 0 ? dailyPaceNeeded.toFixed(0) : 0}/dia</strong>
                            </p>
                        </div>
                    )
                ) : (
                    <div>
                        <p className="text-white font-bold">Sem Meta Definida</p>
                        <Link href="/metas" className="text-xs text-indigo-300 hover:text-white underline">Configurar agora</Link>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-sm text-slate-500 mb-1">A Receber (Pendente)</p>
                <p className="text-2xl font-bold text-amber-500">R$ {pendingIncome.toLocaleString('pt-BR')}</p>
             </div>
             <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><ICONS.Income /></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-sm text-slate-500 mb-1">Despesas do Mês</p>
                <p className="text-2xl font-bold text-red-500">R$ {totalExpenses.toLocaleString('pt-BR')}</p>
             </div>
             <div className="p-2 bg-red-50 text-red-600 rounded-lg"><ICONS.Expenses /></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-sm text-slate-500 mb-1">Saldo Líquido</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                    R$ {balance.toLocaleString('pt-BR')}
                </p>
             </div>
             <div className={`p-2 rounded-lg ${balance >= 0 ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600'}`}>
                <ICONS.Dashboard />
             </div>
          </div>
        </div>
        {/* New Future Cash Flow Card */}
        <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-100">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-sm text-emerald-700 mb-1">A Receber (90 dias)</p>
                <p className="text-2xl font-bold text-emerald-800">R$ {pendingNext90.toLocaleString('pt-BR')}</p>
                <Link href="/receitas" className="text-xs text-emerald-600 hover:underline mt-1 block">{pendingNext90Count} lançamentos &rarr;</Link>
             </div>
             <div className="p-2 bg-white text-emerald-600 rounded-lg shadow-sm"><ICONS.Calculator /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Histórico de Receita</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `R$${value/1000}k`} />
              <Tooltip 
                cursor={{fill: '#f1f5f9'}} 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
              />
              <ReferenceLine y={currentGoal?.target_amount || 0} stroke="#10b981" strokeDasharray="3 3" label="Meta" />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Action Center */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-900"><ICONS.Bolt /></div>
                <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    <ICONS.Bolt /> Central de Ações
                </h2>
                <div className="space-y-3">
                    {actions.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhuma ação pendente.</p>
                    ) : (
                        actions.map((act, i) => (
                            <Link key={i} href={act.link} className={`block p-3 rounded-lg border text-sm transition-colors group ${
                                act.type === 'alert' ? 'bg-red-50 border-red-100 text-red-800 hover:bg-red-100' :
                                act.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800 hover:bg-amber-100' :
                                act.type === 'good' ? 'bg-emerald-50 border-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                                'bg-blue-50 border-blue-100 text-blue-800 hover:bg-blue-100'
                            }`}>
                                <div className="font-bold mb-1 flex justify-between items-center">
                                    <span className="flex items-center gap-2">
                                        {act.type === 'alert' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                        {act.type === 'warning' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                                        {act.type === 'good' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                                        {act.type === 'alert' ? 'Atenção' : act.type === 'warning' ? 'Pendente' : act.type === 'good' ? 'Oportunidade' : 'Sugestão'}
                                    </span>
                                    {act.value && <span className="bg-white/50 px-1.5 py-0.5 rounded text-xs ml-2">{act.value}</span>}
                                </div>
                                <p className="leading-relaxed opacity-90">{act.text}</p>
                            </Link>
                        ))
                    )}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <Link href="/receitas" className="text-center text-xs font-medium bg-slate-50 py-2 rounded hover:bg-slate-100 text-slate-600 transition-colors">Nova Receita</Link>
                    <Link href="/marketing" className="text-center text-xs font-medium bg-slate-50 py-2 rounded hover:bg-slate-100 text-slate-600 transition-colors">Ver MKT</Link>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;