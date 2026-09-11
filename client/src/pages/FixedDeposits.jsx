import { useEffect, useState } from 'react';
import { Landmark, Percent, CalendarDays, WalletCards, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../lib/api';

function money(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function FixedDeposits() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadPlans() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/fixed-deposits/public');
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load fixed deposit plans');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPlans(); }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-sky-500 to-sky-700 rounded-2xl p-6 md:p-8 text-white shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-4">
              <Landmark className="w-4 h-4" /> Fixed Deposits
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold">Grow your savings with fixed-income plans</h1>
            <p className="text-sky-100 text-sm mt-2 max-w-2xl">Choose from the savings products currently enabled by the administrator. Rates, tenure and limits are controlled from the Admin Panel.</p>
          </div>
          <button onClick={loadPlans} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" title="Refresh">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-9 h-9 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" /></div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-sky-100 p-12 text-center">
          <Landmark className="w-12 h-12 text-sky-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-800">No fixed deposit plans available</p>
          <p className="text-gray-400 text-sm mt-1">The administrator has not enabled any FD plans yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div key={plan._id || plan.id} className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 hover:shadow-md hover:border-sky-200 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-sky-500" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold">Active</span>
              </div>
              <h2 className="font-heading text-lg font-bold text-gray-900 mt-4">{plan.name}</h2>
              {plan.short_name && <p className="text-xs text-sky-600 font-semibold mt-0.5">{plan.short_name}</p>}
              <p className="text-gray-400 text-sm mt-2 min-h-10">{plan.description || 'Secure fixed-income savings plan.'}</p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-xl bg-sky-50 p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs"><Percent className="w-3.5 h-3.5" /> Interest</div>
                  <p className="text-xl font-bold text-sky-600 mt-1">{Number(plan.interest_rate).toFixed(2)}%</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs"><CalendarDays className="w-3.5 h-3.5" /> Tenure</div>
                  <p className="text-sm font-bold text-gray-800 mt-2">{plan.tenure}</p>
                </div>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 text-sm">
                <div className="flex justify-between gap-3"><span className="text-gray-400">Minimum</span><span className="font-semibold text-gray-700">₹{money(plan.min_amount)}</span></div>
                {Number(plan.max_amount) > 0 && <div className="flex justify-between gap-3"><span className="text-gray-400">Maximum</span><span className="font-semibold text-gray-700">₹{money(plan.max_amount)}</span></div>}
                <div className="flex justify-between gap-3"><span className="text-gray-400">Payout</span><span className="font-semibold text-gray-700">{plan.payout || 'At maturity'}</span></div>
              </div>

              <div className="mt-5 flex items-center gap-2 text-xs text-gray-400">
                <ShieldCheck className="w-4 h-4 text-sky-500" /> Plan details are administrator controlled
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
