import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, getCreditScoreTier } from '../lib/utils';
import {
  ShieldCheck,
  Users,
  ArrowLeftRight,
  Activity,
  Clock,
  DollarSign,
  Wallet,
  Search,
  ToggleRight,
  ToggleLeft,
  Crown,
  Lock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Send,
  FileText,
  ChevronDown,
  Ban,
  CreditCard,
  Eye,
  EyeOff,
  BadgeCheck,
  UserX,
  WalletCards,
  CalendarDays,
  Languages,
  Banknote,
  Scale,
  KeyRound,
  HandCoins,
  Database,
  Loader2,
  Landmark,
  Check,
  Gift,
  Headphones,
} from 'lucide-react';

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'verify', label: 'Verify', icon: ShieldCheck },
  { id: 'txns', label: 'Txns', icon: FileText },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'wallets', label: 'Wallets', icon: WalletCards },
];

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'sky', sub }) {
  const colors = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    violet: 'bg-violet-50 text-violet-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };
  const borderColors = {
    sky: 'hover:border-sky-200',
    emerald: 'hover:border-emerald-200',
    blue: 'hover:border-blue-200',
    red: 'hover:border-red-200',
    violet: 'hover:border-violet-200',
    cyan: 'hover:border-cyan-200',
  };
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-sky-100 p-5 transition-colors ${borderColors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="font-heading text-xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function Dialog({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-sky-100 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AmountDialog({ title, label, icon: Icon, actionLabel, onSubmit, onClose }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    setLoading(true);
    try {
      await onSubmit(value);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={title}>
      <div className="space-y-4">
        <div>
          <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 block">{label}</label>
          <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading || !amount}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing...' : actionLabel}
        </button>
      </div>
    </Dialog>
  );
}

function UserCard({ user: u, onRefresh }) {
  const [balanceDialog, setBalanceDialog] = useState(false);
  const [loginPasswordDialog, setLoginPasswordDialog] = useState(false);
  const [withdrawPasswordDialog, setWithdrawPasswordDialog] = useState(false);
  const [creditDialog, setCreditDialog] = useState(false);
  const [depositDialog, setDepositDialog] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [profitDialog, setProfitDialog] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceAction, setBalanceAction] = useState('add');
  const [newPassword, setNewPassword] = useState('');
  const [withdrawPassword, setWithdrawPassword] = useState('');
  const [creditScore, setCreditScore] = useState('');
  const [loading, setLoading] = useState(false);

  const tier = getCreditScoreTier(u.credit_score || 0);

  const userId = u._id || u.id;

  async function runAction(fn, reset) {
    setLoading(true);
    try {
      await fn();
      onRefresh();
      reset?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(field) {
    await runAction(() => api.post(`/users/${userId}/toggle`, { field }));
  }

  async function handleBalance() {
    if (!balanceAmount) return;
    await runAction(
      () => api.post(`/users/${userId}/adjust-balance`, {
        action: balanceAction,
        amount: parseFloat(balanceAmount),
      }),
      () => { setBalanceDialog(false); setBalanceAmount(''); }
    );
  }

  async function handleLoginPassword() {
    if (!newPassword) return;
    await runAction(
      () => api.post(`/users/${userId}/set-password`, { password: newPassword }),
      () => { setLoginPasswordDialog(false); setNewPassword(''); }
    );
  }

  async function handleWithdrawPassword() {
    if (!withdrawPassword) return;
    await runAction(
      () => api.post(`/users/${userId}/set-withdrawal-password`, { withdrawal_password: withdrawPassword }),
      () => { setWithdrawPasswordDialog(false); setWithdrawPassword(''); }
    );
  }

  async function handleCredit() {
    if (creditScore === '') return;
    await runAction(
      () => api.post(`/users/${userId}/set-credit-score`, { score: parseInt(creditScore) }),
      () => { setCreditDialog(false); setCreditScore(''); }
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4 space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {u.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-gray-900 font-semibold text-sm truncate">{u.full_name}</p>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-600">
                  {u.role}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${u.identity_status === 'verified' ? 'bg-emerald-50 text-emerald-600' : u.identity_status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                  {u.identity_status || 'unverified'}
                </span>
                {u.has_withdrawal_password ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600">
                    <KeyRound className="w-3 h-3" /> WD Set
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600">
                    <KeyRound className="w-3 h-3" /> WD Not Set
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs truncate">{u.email}</p>
              <p className="flex items-center gap-1 text-gray-400 text-[11px] mt-0.5">
                <CalendarDays className="w-3 h-3" />
                Joined {u.createdAt ? formatDate(u.createdAt) : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 text-xs pt-2">
          <div className="bg-sky-50/60 rounded-lg p-2.5">
            <span className="text-gray-400">Balance</span>
            <p className="text-gray-900 font-semibold">{formatCurrency(u.balance || 0)}</p>
          </div>
          <div className="bg-emerald-50/60 rounded-lg p-2.5">
            <span className="text-gray-400">Total Deposited</span>
            <p className="text-emerald-700 font-semibold">{formatCurrency(u.total_deposited || 0)}</p>
          </div>
          <div className="bg-red-50/60 rounded-lg p-2.5">
            <span className="text-gray-400">Total Withdrawn</span>
            <p className="text-red-700 font-semibold">{formatCurrency(u.total_withdrawn || 0)}</p>
          </div>
          <div className="bg-blue-50/60 rounded-lg p-2.5">
            <span className="text-gray-400">Total Profit</span>
            <p className="text-blue-700 font-semibold">{formatCurrency(u.total_profit || 0)}</p>
          </div>
          <div className="bg-violet-50/60 rounded-lg p-2.5">
            <span className="text-gray-400">Credit Score</span>
            <div className="flex items-center gap-1.5">
              <p className="text-gray-900 font-semibold">{u.credit_score || 0}</p>
              <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${tier.bg} ${tier.color}`}>
                {tier.label}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <span className="flex items-center gap-1 text-gray-400"><Languages className="w-3 h-3" /> Language</span>
            <p className="text-gray-800 font-medium">{u.language || 'en'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <span className="text-gray-400">Date of Birth</span>
            <p className="text-gray-800 font-medium">{u.date_of_birth || '-'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <span className="text-gray-400">Mobile Number</span>
            <p className="text-gray-800 font-medium">{(u.country_code || '') + (u.mobile ? ` ${u.mobile}` : u.mobile || '-')}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <span className="text-gray-400">Referral Code</span>
            <p className="text-gray-800 font-medium font-mono text-[11px]">{u.referral_code || '-'}</p>
            <p className="text-gray-400 text-[10px] mt-0.5">
              {u.referral_count || 0} referred
              {u.referral_earnings > 0 && ` · $${u.referral_earnings} earned`}
            </p>
            {u.referred_by && (
              <p className="text-gray-400 text-[10px] mt-0.5">From: {u.referred_by.full_name || u.referred_by.email || '-'}</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <span className="text-gray-400">Bank Account</span>
            {u.bank_name || u.bank_account_number ? (
              <>
                <p className="text-gray-800 font-medium text-[11px]">{u.bank_name || '-'}</p>
                <p className="text-gray-400 text-[10px] mt-0.5">
                  {u.bank_account_holder} · {u.bank_account_number}
                  {u.bank_ifsc ? ` · ${u.bank_ifsc}` : ''}
                </p>
              </>
            ) : (
              <p className="text-gray-800 font-medium">-</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
          <button
            onClick={() => handleToggle('trading_enabled')}
            disabled={loading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${u.trading_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
          >
            {u.trading_enabled ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
            Trading {u.trading_enabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => handleToggle('withdrawal_enabled')}
            disabled={loading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${u.withdrawal_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
          >
            {u.withdrawal_enabled ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
            Withdraw {u.withdrawal_enabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => handleToggle('premium_enabled')}
            disabled={loading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${u.premium_enabled ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-500'}`}
          >
            <Crown className={`w-4 h-4 ${u.premium_enabled ? 'text-sky-500' : 'text-gray-400'}`} />
            Premium {u.premium_enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
          <button
            onClick={() => setDepositDialog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
          >
            <Banknote className="w-4 h-4" />
            Add Deposit
          </button>
          <button
            onClick={() => setWithdrawDialog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
          >
            <Wallet className="w-4 h-4" />
            Add Withdrawal
          </button>
          <button
            onClick={() => setProfitDialog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
          >
            <HandCoins className="w-4 h-4" />
            Add Profit
          </button>
          <button
            onClick={() => setBalanceDialog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <DollarSign className="w-4 h-4 text-sky-500" />
            Balance
          </button>
          <button
            onClick={() => setCreditDialog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <Scale className="w-4 h-4 text-cyan-500" />
            Credit Score
          </button>
          <button
            onClick={() => setLoginPasswordDialog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <Lock className="w-4 h-4 text-violet-500" />
            Login Password
          </button>
          <button
            onClick={() => setWithdrawPasswordDialog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <KeyRound className="w-4 h-4 text-amber-500" />
            Withdrawal Password
          </button>
        </div>
      </div>

      <Dialog open={balanceDialog} onClose={() => setBalanceDialog(false)} title="Adjust Balance">
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 block">Action</label>
            <div className="flex gap-2">
              <button
                onClick={() => setBalanceAction('add')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${balanceAction === 'add' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
              >
                Add
              </button>
              <button
                onClick={() => setBalanceAction('deduct')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${balanceAction === 'deduct' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
              >
                Deduct
              </button>
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 block">Amount (USDT)</label>
            <input
              type="number"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <button
            onClick={handleBalance}
            disabled={loading || !balanceAmount}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </Dialog>

      <Dialog open={loginPasswordDialog} onClose={() => setLoginPasswordDialog(false)} title="Set Login Password">
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 block">New Login Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new login password"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <button
            onClick={handleLoginPassword}
            disabled={loading || !newPassword}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Setting...' : 'Set Login Password'}
          </button>
        </div>
      </Dialog>

      <Dialog open={withdrawPasswordDialog} onClose={() => setWithdrawPasswordDialog(false)} title="Set Withdrawal Password">
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 block">New Withdrawal Password</label>
            <input
              type="password"
              value={withdrawPassword}
              onChange={(e) => setWithdrawPassword(e.target.value)}
              placeholder="Enter new withdrawal password"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <button
            onClick={handleWithdrawPassword}
            disabled={loading || !withdrawPassword}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Setting...' : 'Set Withdrawal Password'}
          </button>
        </div>
      </Dialog>

      <Dialog open={creditDialog} onClose={() => setCreditDialog(false)} title="Set Credit Score">
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 block">Credit Score</label>
            <input
              type="number"
              value={creditScore}
              onChange={(e) => setCreditScore(e.target.value)}
              placeholder="100"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-2">Tier Thresholds</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-cyan-600">Platinum</span><span className="text-gray-400">&ge; 800</span></div>
              <div className="flex justify-between"><span className="text-sky-600">VIP</span><span className="text-gray-400">&ge; 600</span></div>
              <div className="flex justify-between"><span className="text-emerald-600">Trusted</span><span className="text-gray-400">&ge; 400</span></div>
              <div className="flex justify-between"><span className="text-blue-600">Regular</span><span className="text-gray-400">&ge; 200</span></div>
              <div className="flex justify-between"><span className="text-gray-500">New</span><span className="text-gray-400">&lt; 200</span></div>
            </div>
          </div>
          <button
            onClick={handleCredit}
            disabled={loading || creditScore === ''}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Set Credit Score'}
          </button>
        </div>
      </Dialog>

      {depositDialog && (
        <AmountDialog
          title="Add to Total Deposited"
          label="Amount (USDT)"
          icon={Banknote}
          actionLabel="Add Deposit"
          onClose={() => setDepositDialog(false)}
          onSubmit={async (amount) => {
            await api.post(`/users/${userId}/add-deposit`, { amount });
            setDepositDialog(false);
          }}
        />
      )}

      {withdrawDialog && (
        <AmountDialog
          title="Add to Total Withdrawn"
          label="Amount (USDT)"
          icon={Wallet}
          actionLabel="Add Withdrawal"
          onClose={() => setWithdrawDialog(false)}
          onSubmit={async (amount) => {
            await api.post(`/users/${userId}/add-withdrawal`, { amount });
            setWithdrawDialog(false);
          }}
        />
      )}

      {profitDialog && (
        <AmountDialog
          title="Add to Total Profit"
          label="Amount (USDT)"
          icon={HandCoins}
          actionLabel="Add Profit"
          onClose={() => setProfitDialog(false)}
          onSubmit={async (amount) => {
            await api.post(`/users/${userId}/add-profit`, { amount });
            setProfitDialog(false);
          }}
        />
      )}
    </>
  );
}

function VerifyTab({ onRefresh }) {
  const [subTab, setSubTab] = useState('pending');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const counts = {
    pending: users.filter((u) => u.identity_status === 'pending').length,
    rejected: users.filter((u) => u.identity_status === 'unverified' && u.identity_submitted_at).length,
    all: users.length,
  };

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleVerify(id, status) {
    try {
      await api.post(`/users/${id}/verify`, { status });
      fetchUsers();
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = users.filter((u) => {
    if (subTab === 'pending') return u.identity_status === 'pending';
    if (subTab === 'rejected') return u.identity_status === 'unverified' && u.identity_submitted_at;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['pending', 'rejected', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${subTab === tab ? 'bg-sky-50 text-sky-600 border border-sky-200' : 'bg-gray-100 text-gray-400 hover:text-gray-600 border border-transparent'}`}
          >
            {tab} ({counts[tab]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <BadgeCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No verification requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div key={u._id || u.id} className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 font-semibold text-sm">{u.full_name}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${u.identity_status === 'verified' ? 'bg-emerald-50 text-emerald-600' : u.identity_status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                      {u.identity_status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">{u.email}</p>
                  {u.dob && <p className="text-gray-400 text-xs">DOB: {u.dob}</p>}
                  {u.mobile && <p className="text-gray-400 text-xs">Mobile: {u.mobile}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerify(u._id || u.id, 'verified')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Verify
                  </button>
                  <button
                    onClick={() => handleVerify(u._id || u.id, 'unverified')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionsTab() {
  const [subTab, setSubTab] = useState('pending');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const counts = {
    pending: transactions.filter((t) => t.status === 'pending').length,
    completed: transactions.filter((t) => t.status === 'completed' || t.status === 'approved').length,
  };

  async function fetchTransactions() {
    setLoading(true);
    try {
      const { data } = await api.get('/transactions/all');
      setTransactions(Array.isArray(data) ? data : data.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTransactions(); }, []);

  async function handleApprove(id) {
    try {
      await api.post(`/transactions/${id}/approve`);
      fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleReject(id) {
    try {
      await api.post(`/transactions/${id}/reject`);
      fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = transactions.filter((t) => {
    if (subTab === 'pending') return t.status === 'pending';
    return t.status === 'completed' || t.status === 'approved';
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab === 'pending' ? 'bg-sky-50 text-sky-600 border border-sky-200' : 'bg-gray-100 text-gray-400 hover:text-gray-600 border border-transparent'}`}
        >
          Pending ({counts.pending})
        </button>
        <button
          onClick={() => setSubTab('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab === 'completed' ? 'bg-sky-50 text-sky-600 border border-sky-200' : 'bg-gray-100 text-gray-400 hover:text-gray-600 border border-transparent'}`}
        >
          Completed ({counts.completed})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No transactions</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">User</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Type</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Amount</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Method</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Date</th>
                  <th className="text-right p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t._id || t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-gray-800 text-xs">{t.user?.full_name || t.user_name || t.user_email || 'Unknown'}</td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.type === 'deposit' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-3 text-gray-800 text-xs font-medium">
                      {formatCurrency(t.amount)}
                      {t.amount_inr > 0 && (
                        <span className="text-gray-400 font-normal"> · ₹{t.amount_inr}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <p className="text-gray-400 text-xs">{t.method || '-'}</p>
                      {t.tx_hash && (
                        <p className="text-[10px] text-gray-300 font-mono mt-0.5">UTR: {t.tx_hash}</p>
                      )}
                      {t.bank_details && (
                        <div className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                          <p className="text-gray-500">{t.bank_details.bank_name}</p>
                          <p>{t.bank_details.account_holder} · {t.bank_details.account_number}</p>
                          {t.bank_details.ifsc && <p>IFSC: {t.bank_details.ifsc}</p>}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 text-xs">{t.createdAt ? formatDate(t.createdAt) : (t.created_at ? formatDate(t.created_at) : '-')}</td>
                    <td className="p-3 text-right">
                      {t.status === 'pending' && (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleApprove(t._id || t.id)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(t._id || t.id)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TradeDataTab() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  async function fetchTrades() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/trades');
      setTrades(Array.isArray(data) ? data : data.trades || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTrades(); }, []);

  async function handleOutcome(id, outcome) {
    setSavingId(id);
    try {
      await api.post(`/trades/${id}/admin-outcome`, { outcome });
      fetchTrades();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  }

  const counts = {
    all: trades.length,
    active: trades.filter((t) => t.status === 'active').length,
    won: trades.filter((t) => t.status === 'won').length,
    lost: trades.filter((t) => t.status === 'lost').length,
  };

  const totalVolume = trades.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);

  const filtered = trades.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      const name = t.user_id?.full_name || '';
      const email = t.user_email || '';
      if (!name.toLowerCase().includes(q) && !email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const statusBadge = (status) => {
    const map = {
      active: 'bg-blue-50 text-blue-600',
      won: 'bg-emerald-50 text-emerald-600',
      lost: 'bg-red-50 text-red-600',
    };
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${map[status] || 'bg-gray-50 text-gray-500'}`}>{status}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-3">
          <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider">Total Trades</p>
          <p className="text-gray-900 font-semibold text-xl">{trades.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-3">
          <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider">Total Volume</p>
          <p className="text-gray-900 font-semibold text-xl">{formatCurrency(totalVolume)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-3">
          <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider">Total P/L</p>
          <p className={`font-semibold text-xl ${totalPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totalPL >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totalPL))}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'active', 'won', 'lost'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-sky-50 text-sky-600 border border-sky-200' : 'bg-gray-100 text-gray-400 hover:text-gray-600 border border-transparent'}`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by user email or name..."
          className="w-full bg-white border border-sky-100 rounded-lg pl-10 pr-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder:text-gray-400 shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No trades found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Date</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">User</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Crypto</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Direction</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Amount</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Entry</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Exit</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Duration</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Profit %</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">P/L</th>
                  <th className="text-left p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="text-right p-3 text-gray-400 text-xs font-medium uppercase tracking-wider">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => {
                  const isWon = t.status === 'won';
                  const isLost = t.status === 'lost';
                  return (
                    <tr key={t._id || t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 text-gray-400 text-xs">{t.createdAt ? formatDate(t.createdAt) : '-'}</td>
                      <td className="p-3">
                        <p className="text-gray-800 text-xs font-medium">{t.user_id?.full_name || 'Unknown'}</p>
                        <p className="text-gray-400 text-[11px]">{t.user_email || '-'}</p>
                      </td>
                      <td className="p-3 text-gray-800 text-xs font-semibold">{t.crypto}</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.direction === 'buy' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {(t.direction || 'buy').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-gray-800 text-xs font-medium">{formatCurrency(t.amount)}</td>
                      <td className="p-3 text-gray-800 text-xs">{t.entry_price ? formatCurrency(t.entry_price) : '-'}</td>
                      <td className="p-3 text-gray-800 text-xs">{t.exit_price ? formatCurrency(t.exit_price) : '-'}</td>
                      <td className="p-3 text-gray-800 text-xs">{t.duration ? `${t.duration}s` : '-'}</td>
                      <td className="p-3 text-gray-800 text-xs">{t.profit_percent ? `${t.profit_percent}%` : '-'}</td>
                      <td className="p-3">
                        <p className={`text-xs font-semibold ${(t.profit_loss || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {(t.profit_loss || 0) >= 0 ? '+' : ''}{formatCurrency(t.profit_loss || 0)}
                        </p>
                      </td>
                      <td className="p-3">{statusBadge(t.status)}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleOutcome(t._id || t.id, 'won')}
                            disabled={savingId === (t._id || t.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 ${isWon ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                          >
                            Won
                          </button>
                          <button
                            onClick={() => handleOutcome(t._id || t.id, 'lost')}
                            disabled={savingId === (t._id || t.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 ${isLost ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                          >
                            Lost
                          </button>
                        </div>
                        {t.admin_outcome && (
                          <p className="text-[10px] text-gray-400 mt-1">Admin: {t.admin_outcome}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function WalletsTab({ users = [] }) {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ currency: 'USDT_TRC20', address: '', label: '', network: 'TRC20' });
  const [adding, setAdding] = useState(false);

  const [inrRate, setInrRate] = useState(85);
  const [rateSaving, setRateSaving] = useState(false);

  const [banks, setBanks] = useState([]);
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    account_holder: '',
    account_number: '',
    ifsc_code: '',
    upi_id: '',
    branch: '',
    note: '',
  });
  const [bankAdding, setBankAdding] = useState(false);

  const [refCode, setRefCode] = useState('');
  const [refOwner, setRefOwner] = useState('');
  const [refSaving, setRefSaving] = useState(false);
  const [refMsg, setRefMsg] = useState('');

  const [tgUsername, setTgUsername] = useState('');
  const [tgSaving, setTgSaving] = useState(false);
  const [tgMsg, setTgMsg] = useState('');

  async function fetchWallets() {
    const { data } = await api.get('/wallets/all');
    setWallets(Array.isArray(data) ? data : data.wallets || []);
  }

  async function fetchBanks() {
    const { data } = await api.get('/banks/all');
    setBanks(Array.isArray(data) ? data : data.banks || []);
  }

  async function fetchSettings() {
    const { data } = await api.get('/settings');
    if (data?.inr_rate) setInrRate(Number(data.inr_rate));
    if (data?.support_telegram) setTgUsername(String(data.support_telegram).replace(/^@/, ''));
  }

  async function fetchReferral() {
    try {
      const { data } = await api.get('/referrals/master');
      if (data?.code) setRefCode(data.code);
      if (data?.owner?._id) setRefOwner(data.owner._id);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchAll() {
    setLoading(true);
    try {
      await Promise.all([fetchWallets(), fetchBanks(), fetchSettings(), fetchReferral()]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.address) return;
    setAdding(true);
    try {
      await api.post('/wallets', form);
      setForm({ currency: 'USDT_TRC20', address: '', label: '', network: 'TRC20' });
      fetchWallets();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/wallets/${id}`);
      fetchWallets();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRateSave() {
    const value = parseFloat(inrRate);
    if (!value || value <= 0) return;
    setRateSaving(true);
    try {
      await api.put('/settings', { key: 'inr_rate', value });
    } catch (err) {
      console.error(err);
    } finally {
      setRateSaving(false);
    }
  }

  async function handleRefSave() {
    if (!refCode.trim() || !refOwner) return;
    setRefSaving(true);
    setRefMsg('');
    try {
      const { data } = await api.post('/referrals/set-master', { code: refCode, owner_id: refOwner });
      setRefCode(data.code);
      setRefMsg(`Saved! Signups now require code ${data.code}`);
    } catch (err) {
      setRefMsg(err?.response?.data?.message || 'Failed to save');
    } finally {
      setRefSaving(false);
    }
  }

  async function handleTgSave() {
    if (!tgUsername.trim()) return;
    setTgSaving(true);
    setTgMsg('');
    try {
      await api.put('/settings', { key: 'support_telegram', value: tgUsername.trim().replace(/^@/, '') });
      setTgMsg('Saved! Support button updated.');
    } catch (err) {
      setTgMsg(err?.response?.data?.message || 'Failed to save');
    } finally {
      setTgSaving(false);
    }
  }

  async function handleBankAdd(e) {
    e.preventDefault();
    if (!bankForm.bank_name || !bankForm.account_holder || !bankForm.account_number) return;
    setBankAdding(true);
    try {
      await api.post('/banks', bankForm);
      setBankForm({ bank_name: '', account_holder: '', account_number: '', ifsc_code: '', upi_id: '', branch: '', note: '' });
      fetchBanks();
    } catch (err) {
      console.error(err);
    } finally {
      setBankAdding(false);
    }
  }

  async function handleBankToggle(bank) {
    try {
      await api.put(`/banks/${bank._id || bank.id}`, { is_active: !bank.is_active });
      fetchBanks();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleBankDelete(id) {
    try {
      await api.delete(`/banks/${id}`);
      fetchBanks();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-4 h-4 text-sky-500" />
          <h4 className="text-gray-900 text-sm font-semibold">INR Deposit Rate</h4>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-32">
            <input
              type="number"
              min="1"
              step="0.01"
              value={inrRate}
              onChange={(e) => setInrRate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <p className="text-gray-400 text-xs">INR per 1 USDT</p>
          <button
            onClick={handleRateSave}
            disabled={rateSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
          >
            {rateSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Rate
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-sky-500" />
          <h4 className="text-gray-900 text-sm font-semibold">Referral Program</h4>
        </div>
        <p className="text-gray-400 text-xs mb-3">
          Only this single referral code will be accepted at signup. The owner earns the $5 bonus for each new user.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">Master Referral Code</label>
            <input
              type="text"
              value={refCode}
              onChange={(e) => setRefCode(e.target.value.toUpperCase())}
              placeholder="J9115UTT"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">Owner Account (earns bonus)</label>
            <select
              value={refOwner}
              onChange={(e) => setRefOwner(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="">Select account</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.full_name || u.email} ({u.email})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <button
            onClick={handleRefSave}
            disabled={refSaving || !refCode.trim() || !refOwner}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
          >
            {refSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Referral Code
          </button>
          {refMsg && <p className={`text-xs ${refMsg.startsWith('Saved') ? 'text-emerald-600' : 'text-red-500'}`}>{refMsg}</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Headphones className="w-4 h-4 text-sky-500" />
          <h4 className="text-gray-900 text-sm font-semibold">Customer Support</h4>
        </div>
        <p className="text-gray-400 text-xs mb-3">
          The floating "Chat with Support" button opens this Telegram handle on every page.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-64">
            <input
              type="text"
              value={tgUsername}
              onChange={(e) => setTgUsername(e.target.value.replace(/^@/, ''))}
              placeholder="YourTelegramBot"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <span className="text-gray-400 text-xs">t.me/<span className="font-semibold text-gray-600">{tgUsername || '...'}</span></span>
          <button
            onClick={handleTgSave}
            disabled={tgSaving || !tgUsername.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
          >
            {tgSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
          {tgMsg && <p className={`text-xs ${tgMsg.startsWith('Saved') ? 'text-emerald-600' : 'text-red-500'}`}>{tgMsg}</p>}
        </div>
      </div>

      <form onSubmit={handleBankAdd} className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Banknote className="w-4 h-4 text-sky-500" />
          <h4 className="text-gray-900 text-sm font-semibold">Add Bank Account</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">Bank Name</label>
            <input
              type="text"
              value={bankForm.bank_name}
              onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
              placeholder="HDFC Bank"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">Account Holder</label>
            <input
              type="text"
              value={bankForm.account_holder}
              onChange={(e) => setBankForm({ ...bankForm, account_holder: e.target.value })}
              placeholder="Account holder name"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">Account Number</label>
            <input
              type="text"
              value={bankForm.account_number}
              onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
              placeholder="Account number"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">IFSC Code</label>
            <input
              type="text"
              value={bankForm.ifsc_code}
              onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value })}
              placeholder="HDFC0001234"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">UPI ID</label>
            <input
              type="text"
              value={bankForm.upi_id}
              onChange={(e) => setBankForm({ ...bankForm, upi_id: e.target.value })}
              placeholder="name@upi"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">Branch</label>
            <input
              type="text"
              value={bankForm.branch}
              onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
              placeholder="Branch (optional)"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">Note</label>
            <input
              type="text"
              value={bankForm.note}
              onChange={(e) => setBankForm({ ...bankForm, note: e.target.value })}
              placeholder="Instruction note (optional)"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={bankAdding || !bankForm.bank_name || !bankForm.account_holder || !bankForm.account_number}
          className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          {bankAdding ? 'Adding...' : 'Add Bank Account'}
        </button>
      </form>

      {banks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="w-4 h-4 text-sky-500" />
            <h4 className="text-gray-900 text-sm font-semibold">Bank Accounts ({banks.length})</h4>
          </div>
          <div className="space-y-2">
            {banks.map((b) => (
              <div key={b._id || b.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-gray-800 text-sm font-semibold">{b.bank_name}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${b.is_active === false ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {b.is_active === false ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {b.account_holder} · {b.account_number}
                    {b.ifsc_code ? ` · ${b.ifsc_code}` : ''}
                    {b.upi_id ? ` · ${b.upi_id}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleBankToggle(b)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${b.is_active === false ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {b.is_active === false ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    {b.is_active === false ? 'Activate' : 'Deactivate'}
                  </button>
                  <button
                    onClick={() => handleBankDelete(b._id || b.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
        <h4 className="text-gray-900 text-sm font-semibold mb-3">Add Wallet Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="USDT_TRC20">USDT (TRC20)</option>
              <option value="USDT_ERC20">USDT (ERC20)</option>
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH)</option>
              <option value="USDC">USD Coin (USDC)</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Wallet address"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">Label</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Label (optional)"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1 block">Network</label>
            <select
              value={form.network}
              onChange={(e) => setForm({ ...form, network: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="TRC20">TRC20</option>
              <option value="ERC20">ERC20</option>
              <option value="BEP20">BEP20</option>
              <option value="BTC">Bitcoin</option>
              <option value="SPL">SPL</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={adding || !form.address}
          className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          {adding ? 'Adding...' : 'Add Wallet'}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" /></div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-12">
          <WalletCards className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No wallet addresses</p>
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map((w) => (
            <div key={w._id || w.id} className="bg-white rounded-xl shadow-sm border border-sky-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-sky-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-600">
                      {w.currency || 'USDT'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                      {w.network || 'TRC20'}
                    </span>
                    {w.label && <span className="text-gray-400 text-xs">{w.label}</span>}
                  </div>
                  <p className="text-gray-800 text-xs font-mono truncate mt-1">{w.address}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(w._id || w.id)}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  async function fetchAdminData() {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/users'),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (usersRes.status === 'fulfilled') {
        const udata = usersRes.value.data;
        setUsers(Array.isArray(udata) ? udata : udata.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      fetchAdminData();
    }
  }, [authLoading, user]);

  if (authLoading || !user) return <Spinner />;
  if (user.role !== 'admin') return <Spinner />;

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.mobile?.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-sky-500" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Manage users, transactions, trades, and wallet addresses</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" /></div>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard icon={Users} label="Total Users" value={stats.total_users ?? stats.totalUsers ?? 0} color="sky" />
                <StatCard icon={ArrowLeftRight} label="Total Trades" value={stats.total_trades ?? stats.totalTrades ?? 0} color="blue" />
                <StatCard icon={Activity} label="Active Trades" value={stats.active_trades ?? stats.activeTrades ?? 0} color="violet" />
                <StatCard icon={Clock} label="Pending Txns" value={stats.pending_transactions ?? stats.pendingTransactions ?? 0} color="red" />
                <StatCard icon={TrendingUp} label="Total Deposits" value={formatCurrency(stats.total_deposits ?? stats.totalDeposits ?? 0)} color="emerald" />
                <StatCard icon={TrendingDown} label="Total Withdrawals" value={formatCurrency(stats.total_withdrawals ?? stats.totalWithdrawals ?? 0)} color="cyan" />
              </div>
            )}

            <div className="grid grid-cols-6 gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-sky-100">
              {TABS.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-sky-50 text-sky-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                  >
                    <TabIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="animate-fade-in">
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users..."
                        className="w-full bg-white border border-sky-100 rounded-lg pl-10 pr-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder:text-gray-400 shadow-sm"
                      />
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200">
                      {filteredUsers.length} users
                    </span>
                  </div>
                  <div className="space-y-3">
                    {filteredUsers.map((u) => (
                      <UserCard key={u.id} user={u} onRefresh={fetchAdminData} />
                    ))}
                    {filteredUsers.length === 0 && (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No users found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'verify' && <VerifyTab onRefresh={fetchAdminData} />}
              {activeTab === 'txns' && <TransactionsTab />}
              {activeTab === 'data' && <TradeDataTab />}
              {activeTab === 'wallets' && <WalletsTab users={users} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
