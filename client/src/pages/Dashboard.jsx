import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Diamond,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowLeftRight,
  DollarSign,
  ShieldCheck,
  Shield,
  Crown,
  Star,
  Activity,
  Clock,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { formatCurrency, formatNumber } from '../lib/utils';

const CRYPTO_CONFIG = {
  BTC: { bg: 'bg-orange-500/10', color: 'text-orange-500', label: 'Bitcoin', coinId: 'bitcoin' },
  ETH: { bg: 'bg-blue-500/10', color: 'text-blue-500', label: 'Ethereum', coinId: 'ethereum' },
  BNB: { bg: 'bg-yellow-500/10', color: 'text-yellow-500', label: 'BNB', coinId: 'binancecoin' },
  SOL: { bg: 'bg-violet-500/10', color: 'text-violet-500', label: 'Solana', coinId: 'solana' },
  XRP: { bg: 'bg-slate-500/10', color: 'text-slate-500', label: 'XRP', coinId: 'ripple' },
  DOGE: { bg: 'bg-orange-500/10', color: 'text-orange-500', label: 'Dogecoin', coinId: 'dogecoin' },
  ADA: { bg: 'bg-sky-500/10', color: 'text-sky-500', label: 'Cardano', coinId: 'cardano' },
  DOT: { bg: 'bg-pink-500/10', color: 'text-pink-500', label: 'Polkadot', coinId: 'polkadot' },
};

const COINGECKO_MAP = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  DOT: 'polkadot',
};

const TICKER_SYMBOLS = [
  'BTC',
  'ETH',
  'BNB',
  'SOL',
  'XRP',
  'DOGE',
  'ADA',
  'DOT',
  'MATIC',
  'LINK',
];

const DRIFT_CONFIGS = [
  { top: '8%', left: '5%', duration: '18s', delay: '0s', anim: 'drift0' },
  { top: '15%', left: '85%', duration: '22s', delay: '2s', anim: 'drift1' },
  { top: '30%', left: '15%', duration: '20s', delay: '4s', anim: 'drift2' },
  { top: '45%', left: '75%', duration: '25s', delay: '1s', anim: 'drift0' },
  { top: '60%', left: '40%', duration: '19s', delay: '3s', anim: 'drift1' },
  { top: '75%', left: '90%', duration: '23s', delay: '5s', anim: 'drift2' },
  { top: '20%', left: '55%', duration: '21s', delay: '0.5s', anim: 'drift0' },
  { top: '85%', left: '25%', duration: '17s', delay: '2.5s', anim: 'drift1' },
  { top: '50%', left: '65%', duration: '24s', delay: '1.5s', anim: 'drift2' },
  { top: '35%', left: '10%', duration: '20s', delay: '3.5s', anim: 'drift0' },
];

const SAMPLE_NEWS = [
  {
    title: 'Bitcoin Surges Past $72K as Institutional Demand Grows',
    summary:
      'Major financial institutions continue to increase their Bitcoin holdings, driving prices to new highs this quarter.',
    time: '2h ago',
    tag: 'Bitcoin',
  },
  {
    title: 'Ethereum Layer 2 Adoption Reaches Record Levels',
    summary:
      'Transaction volumes on Ethereum L2 networks have surpassed 50 million daily transactions for the first time.',
    time: '5h ago',
    tag: 'Ethereum',
  },
  {
    title: 'Central Banks Accelerate Digital Currency Research',
    summary:
      'Over 130 countries are now exploring central bank digital currencies, with 19 in advanced pilot stages.',
    time: '8h ago',
    tag: 'Regulation',
  },
];

function PriceTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-sky-100 px-3 py-2">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-bold text-gray-800">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }

  return null;
}

export default function Dashboard() {
  const { user } = useAuth();

  const [prices, setPrices] = useState({});
  const [activeTrades, setActiveTrades] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [countdowns, setCountdowns] = useState({});
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Fresh user data from backend
  const [dashboardUser, setDashboardUser] = useState(user || null);

  const firstName =
    dashboardUser?.full_name?.split(' ')[0] || 'Trader';

  const initial =
    dashboardUser?.full_name?.[0]?.toUpperCase() || 'U';

  const balance = Number(dashboardUser?.balance ?? 0);

  const frozenBalance = Number(
    dashboardUser?.frozen_balance ??
      dashboardUser?.frozenBalance ??
      0
  );

  const availableBalance = Math.max(
    0,
    Number(
      dashboardUser?.available_balance ??
        dashboardUser?.availableBalance ??
        balance - frozenBalance
    )
  );

  const totalTrades =
    tradeHistory.length > 0
      ? tradeHistory.length
      : Number(dashboardUser?.total_trades ?? 0);

  const totalPL =
    dashboardUser?.total_pl ??
    dashboardUser?.total_profit ??
    0;

  const totalDeposited =
    dashboardUser?.total_deposited ?? 0;

  const creditScore =
    dashboardUser?.credit_score ?? 0;

  useEffect(() => {
    if (user) {
      setDashboardUser(user);
    }
  }, [user]);

  useEffect(() => {
    fetchPrices();
    fetchDashboardData();
    fetchFreshUser();

    const priceInterval = setInterval(fetchPrices, 15000);

    const userInterval = setInterval(fetchFreshUser, 10000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(userInterval);
    };
  }, [user?._id, user?.id]);

  useEffect(() => {
    fetchChartData();
  }, [selectedCrypto]);

  useEffect(() => {
    if (activeTrades.length === 0) {
      setCountdowns({});
      return;
    }

    const update = () => {
      const next = {};

      activeTrades.forEach((trade) => {
        const rawEnd =
          trade.expires_at ||
          trade.end_time ||
          (trade.created_at &&
            new Date(trade.created_at).getTime() +
              (trade.duration || 0) * 1000);

        const end = new Date(rawEnd).getTime();

        next[trade.id || trade._id] = Math.max(
          0,
          Math.ceil((end - Date.now()) / 1000)
        );
      });

      setCountdowns(next);
    };

    update();

    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [activeTrades]);

  async function fetchFreshUser() {
    try {
      const userId = user?._id || user?.id;

      if (!userId) return;

      const { data } = await api.get(`/users/${userId}`);

      if (data) {
        setDashboardUser((current) => ({
          ...(current || {}),
          ...data,
        }));
      }
    } catch (err) {
      console.error('Failed to refresh user data:', err);
    }
  }

async function fetchPrices() {
  try {
    const { data } = await api.get('/prices/prices');

    const normalized = {};

    Object.keys(CRYPTO_CONFIG).forEach((symbol) => {
      const raw = data?.[symbol] || {};

      normalized[symbol] = {
        price: Number(raw.price ?? raw.usd ?? raw.last ?? 0),
        change_24h: Number(
          raw.change_24h ?? raw.usd_24h_change ?? raw.change ?? 0
        ),
        volume: Number(
          raw.volume_24h ?? raw.usd_24h_vol ?? raw.volume ?? raw.quote_volume ?? 0
        ),
        high_24h: Number(
          raw.high_24h ?? raw.high ?? 0
        ),
        low_24h: Number(
          raw.low_24h ?? raw.low ?? 0
        ),
        last_updated: raw.last_updated ?? 0,
      };
    });

    setPrices(normalized);

    console.log('Live prices loaded:', normalized);
  } catch (err) {
    console.error(
      'Failed to fetch prices:',
      err.response?.data || err.message
    );
  }
}
      setPrices(normalized);
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    }
  }

  async function fetchDashboardData() {
    try {
      const [activeRes, historyRes] =
        await Promise.allSettled([
          api.get('/trades/active'),
          api.get('/trades'),
        ]);

      if (activeRes.status === 'fulfilled') {
        setActiveTrades(activeRes.value.data);
      }

      if (historyRes.status === 'fulfilled') {
        setTradeHistory(historyRes.value.data);
      }
    } catch (err) {
      console.error(
        'Failed to fetch dashboard data:',
        err
      );
    }
  }

  async function fetchChartData() {
    try {
      setChartLoading(true);

      const coinId =
        CRYPTO_CONFIG[selectedCrypto].coinId;

      const { data } = await api.get(
        `/prices/market-chart/${coinId}`
      );

      if (data && data.prices) {
        const formatted = data.prices.map((p) => ({
          time: new Date(p[0]).toLocaleTimeString(
            'en-US',
            {
              hour: '2-digit',
              minute: '2-digit',
            }
          ),
          price: p[1],
        }));

        setChartData(formatted);
      }
    } catch (err) {
      console.error(
        'Failed to fetch chart data:',
        err
      );

      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }

  function getCreditBadge() {
    if (creditScore >= 700) {
      return {
        label: 'Premium',
        icon: Crown,
        iconColor: 'text-sky-500',
        labelColor: 'text-sky-600',
        bg: 'bg-sky-50 border-sky-200',
      };
    }

    if (creditScore >= 400) {
      return {
        label: 'Trusted',
        icon: Shield,
        iconColor: 'text-emerald-500',
        labelColor: 'text-emerald-600',
        bg: 'bg-emerald-50 border-emerald-200',
      };
    }

    return {
      label: 'Standard',
      icon: Star,
      iconColor: 'text-gray-400',
      labelColor: 'text-gray-500',
      bg: 'bg-gray-50 border-gray-200',
    };
  }

  const creditBadge = getCreditBadge();
  const CreditIcon = creditBadge.icon;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[560px] h-[560px] rounded-full bg-sky-400 opacity-5 blur-[120px]" />

        <div className="absolute bottom-[-10%] left-[-5%] w-[560px] h-[560px] rounded-full bg-sky-400 opacity-5 blur-[120px]" />

        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{
            fontSize: 'clamp(3rem, 8vw, 7rem)',
          }}
        >
          <span
            className="font-heading font-bold text-sky-500 whitespace-nowrap"
            style={{ opacity: 0.03 }}
          >
            Gemini Exchange
          </span>
        </div>

        {DRIFT_CONFIGS.map((cfg, i) => (
          <span
            key={i}
            className="absolute text-sky-300/20 font-mono text-sm font-semibold"
            style={{
              top: cfg.top,
              left: cfg.left,
              animation: `${cfg.anim} ${cfg.duration} ease-in-out ${cfg.delay} infinite`,
            }}
          >
            {TICKER_SYMBOLS[i]}
          </span>
        ))}
      </div>

      <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* USER HEADER */}
        <div className="animate-fade-in bg-white rounded-xl shadow-sm border border-sky-100 p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-xl font-bold text-white">
                {initial}
              </div>

              {dashboardUser?.identity_status ===
                'verified' && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white">
                  <ShieldCheck className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-heading text-lg font-bold text-gray-800 truncate">
                  {dashboardUser?.full_name || 'User'}
                </h2>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${creditBadge.bg}`}
                >
                  <CreditIcon
                    className={`w-3 h-3 ${creditBadge.iconColor}`}
                  />
                  <span
                    className={creditBadge.labelColor}
                  >
                    {creditBadge.label}
                  </span>
                </span>
              </div>

              <p className="text-sm text-gray-400 truncate mt-0.5">
                {dashboardUser?.email || ''}
              </p>
            </div>
          </div>
        </div>

        {/* WELCOME */}
        <div
          className="animate-fade-in"
          style={{ animationDelay: '0.05s' }}
        >
          <h1 className="font-heading text-2xl font-bold text-gray-800">
            Welcome back,{' '}
            <span className="text-sky-500">
              {firstName}
            </span>
          </h1>
        </div>

        {/* PORTFOLIO VALUE */}
        <div
          className="animate-fade-in bg-white rounded-xl shadow-sm border border-sky-100 p-6 flex flex-wrap items-center justify-between gap-4"
          style={{ animationDelay: '0.1s' }}
        >
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mb-1">
              Portfolio Value
            </p>

            <p className="font-heading text-3xl font-bold text-gray-800">
              {formatCurrency(balance)}{' '}
              <span className="text-lg text-gray-400 font-normal">
                USDT
              </span>
            </p>
          </div>

          {totalPL !== 0 && (
            <div
              className={`flex items-center gap-1.5 text-sm font-medium ${
                totalPL >= 0
                  ? 'text-emerald-600'
                  : 'text-red-600'
              }`}
            >
              {totalPL >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}

              <span>
                {totalPL >= 0 ? '+' : ''}
                {formatCurrency(totalPL)} all time
              </span>
            </div>
          )}
        </div>

        {/* BALANCE CARDS */}
        <div
          className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in"
          style={{ animationDelay: '0.15s' }}
        >
          {/* ACCOUNT BALANCE */}
          <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
            <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center mb-3">
              <Wallet className="w-5 h-5 text-sky-500" />
            </div>

            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              Account Balance
            </p>

            <p className="font-heading text-xl font-bold text-gray-800 mt-1">
              {formatCurrency(balance)}
            </p>
          </div>

          {/* FROZEN AMOUNT */}
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5 text-amber-500" />
            </div>

            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              Frozen Amount
            </p>

            <p className="font-heading text-xl font-bold text-amber-600 mt-1">
              {formatCurrency(frozenBalance)}
            </p>

            <p className="text-xs text-gray-400 mt-1">
              {frozenBalance > 0
                ? 'Temporarily locked'
                : 'No amount frozen'}
            </p>
          </div>

          {/* AVAILABLE BALANCE */}
          <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <Unlock className="w-5 h-5 text-emerald-500" />
            </div>

            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              Available Balance
            </p>

            <p className="font-heading text-xl font-bold text-emerald-600 mt-1">
              {formatCurrency(availableBalance)}
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Available for trading
            </p>
          </div>

          {/* TOTAL TRADES */}
          <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
              <ArrowLeftRight className="w-5 h-5 text-blue-500" />
            </div>

            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              Total Trades
            </p>

            <p className="font-heading text-xl font-bold text-gray-800 mt-1">
              {totalTrades}
            </p>
          </div>

          {/* TOTAL P/L */}
          <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                totalPL >= 0
                  ? 'bg-emerald-50'
                  : 'bg-red-50'
              }`}
            >
              {totalPL >= 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>

            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              Total P/L
            </p>

            <p
              className={`font-heading text-xl font-bold mt-1 ${
                totalPL >= 0
                  ? 'text-emerald-600'
                  : 'text-red-600'
              }`}
            >
              {totalPL >= 0 ? '+' : ''}
              {formatCurrency(totalPL)}
            </p>
          </div>
        </div>

        {/* DEPOSITED */}
        <div
          className="bg-white rounded-xl shadow-sm border border-sky-100 p-4 animate-fade-in"
          style={{ animationDelay: '0.18s' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-violet-500" />
            </div>

            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                Total Deposited
              </p>

              <p className="font-heading text-xl font-bold text-gray-800">
                {formatCurrency(totalDeposited)}
              </p>
            </div>
          </div>
        </div>

        {/* MARKETS */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-gray-800">
                  Live Markets
                </h2>
              </div>

              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>

                <span className="text-emerald-600 text-xs font-medium">
                  Live
                </span>

                <span className="text-gray-400 text-xs">
                  · Updates every 15s
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.keys(CRYPTO_CONFIG).map(
                (symbol) => {
                  const coin = prices[symbol] || {};
                  const cfg = CRYPTO_CONFIG[symbol];

                  const change =
                    coin.change_24h ??
                    coin.change ??
                    0;

                  const price =
                    coin.price ??
                    coin.last ??
                    0;

                  const volume =
                    coin.volume ??
                    coin.quote_volume ??
                    0;

                  const high24 =
                    coin.high_24h ??
                    coin.high ??
                    0;

                  const isPositive = change >= 0;
                  const isSelected =
                    selectedCrypto === symbol;

                  return (
                    <button
                      key={symbol}
                      onClick={() =>
                        setSelectedCrypto(symbol)
                      }
                      className={`bg-white rounded-xl shadow-sm border p-4 text-left transition-all group ${
                        isSelected
                          ? 'border-sky-400 ring-2 ring-sky-100'
                          : 'border-sky-100 hover:border-sky-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}
                        >
                          <span
                            className={`text-xs font-bold ${cfg.color}`}
                          >
                            {symbol.slice(0, 2)}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {symbol}/USDT
                          </p>

                          <p className="text-xs text-gray-400 truncate">
                            {cfg.label}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`flex items-center gap-1 text-xs font-medium mb-2 ${
                          isPositive
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}

                        <span>
                          {isPositive ? '+' : ''}
                          {typeof change === 'number'
                            ? change.toFixed(2)
                            : '0.00'}
                          %
                        </span>
                      </div>

                      <p className="font-heading text-lg font-bold text-gray-800 mb-2">
                        {price > 0
                          ? formatCurrency(price)
                          : '$0.00'}
                      </p>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">
                            Volume
                          </span>

                          <span className="text-gray-600">
                            {formatNumber(volume)}
                          </span>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">
                            24h High
                          </span>

                          <span className="text-gray-600">
                            {high24 > 0
                              ? formatCurrency(high24)
                              : '-'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* CHART */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                    <Diamond className="w-5 h-5 text-sky-500" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                      Live Chart
                    </p>

                    <p className="font-heading text-lg font-bold text-gray-800 truncate">
                      {selectedCrypto}/USDT
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-600 text-xs font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                  </span>
                  24H
                </span>
              </div>

              {chartLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="w-6 h-6 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={200}
                >
                  <AreaChart
                    data={chartData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="skyChartGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#0ea5e9"
                          stopOpacity={0.25}
                        />

                        <stop
                          offset="95%"
                          stopColor="#0ea5e9"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="time"
                      tick={{
                        fill: '#9ca3af',
                        fontSize: 11,
                      }}
                      axisLine={{
                        stroke: '#e2e8f0',
                      }}
                      tickLine={false}
                    />

                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{
                        fill: '#9ca3af',
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        `$${v.toLocaleString()}`
                      }
                      width={70}
                    />

                    <Tooltip
                      content={<PriceTooltip />}
                    />

                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      fill="url(#skyChartGradient)"
                    />

                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#0369a1"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                  No chart data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE + HISTORY */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in"
          style={{ animationDelay: '0.25s' }}
        >
          {/* ACTIVE TRADES */}
          <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-sky-500" />

              <h3 className="font-heading text-lg font-bold text-gray-800">
                Active Trades
              </h3>

              {activeTrades.length > 0 && (
                <span className="ml-auto px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-600 text-xs font-semibold">
                  {activeTrades.length}
                </span>
              )}
            </div>

            {activeTrades.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-10 h-10 text-sky-200 mx-auto mb-3" />

                <p className="text-gray-400 text-sm">
                  No active trades
                </p>

                <p className="text-gray-300 text-xs mt-1">
                  Start trading to see your positions here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTrades
                  .slice(0, 6)
                  .map((trade) => {
                    const symbol =
                      trade.crypto ||
                      trade.symbol ||
                      'N/A';

                    const side =
                      trade.direction ||
                      trade.side ||
                      'open';

                    const isBuy = side === 'buy';

                    const remaining =
                      countdowns[
                        trade.id || trade._id
                      ] ?? 0;

                    const isUrgent =
                      remaining < 10 &&
                      remaining > 0;

                    return (
                      <div
                        key={
                          trade.id || trade._id
                        }
                        className="flex items-center justify-between p-3 rounded-xl bg-sky-50/50 border border-sky-100"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isBuy
                                ? 'bg-emerald-100'
                                : 'bg-red-100'
                            }`}
                          >
                            {isBuy ? (
                              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-600" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {symbol}/USDT
                            </p>

                            <p className="text-xs text-gray-400">
                              <span
                                className={
                                  isBuy
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                                }
                              >
                                {side.toUpperCase()}
                              </span>

                              {' · '}
                              {formatCurrency(
                                trade.amount || 0
                              )}

                              {trade.profit_percent
                                ? ` · +${trade.profit_percent}%`
                                : ''}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 flex-shrink-0 ${
                            isUrgent
                              ? 'text-red-500'
                              : 'text-gray-400'
                          }`}
                        >
                          <Clock
                            className={`w-4 h-4 ${
                              isUrgent
                                ? 'animate-pulse'
                                : ''
                            }`}
                          />

                          <span className="font-mono text-sm font-semibold">
                            {remaining}s
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* RECENT TRADES */}
          <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-sky-500" />

              <h3 className="font-heading text-lg font-bold text-gray-800">
                Recent Trades
              </h3>
            </div>

            {tradeHistory.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-10 h-10 text-sky-200 mx-auto mb-3" />

                <p className="text-gray-400 text-sm">
                  No trade history yet
                </p>

                <p className="text-gray-300 text-xs mt-1">
                  Your completed trades will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tradeHistory
                  .slice(0, 6)
                  .map((trade) => {
                    const symbol =
                      trade.crypto ||
                      trade.symbol ||
                      'N/A';

                    const pnl =
                      trade.profit_loss ??
                      trade.pnl ??
                      0;

                    const won =
                      trade.status === 'won' ||
                      trade.status === 'profit';

                    const lost =
                      trade.status === 'lost' ||
                      trade.status === 'loss';

                    const date = trade.created_at
                      ? new Date(
                          trade.created_at
                        ).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                          }
                        )
                      : '';

                    return (
                      <div
                        key={
                          trade.id || trade._id
                        }
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              won
                                ? 'bg-emerald-100'
                                : lost
                                ? 'bg-red-100'
                                : 'bg-sky-100'
                            }`}
                          >
                            {won ? (
                              <TrendingUp className="w-4 h-4 text-emerald-600" />
                            ) : lost ? (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            ) : (
                              <Activity className="w-4 h-4 text-sky-500" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {symbol}/USDT
                            </p>

                            <p className="text-xs text-gray-400 capitalize">
                              {trade.direction ||
                                trade.side}{' '}
                              · {date || 'Just now'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p
                            className={`text-sm font-semibold ${
                              pnl >= 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }`}
                          >
                            {pnl >= 0 ? '+' : ''}
                            {formatCurrency(pnl)}
                          </p>

                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              won
                                ? 'bg-emerald-50 text-emerald-600'
                                : lost
                                ? 'bg-red-50 text-red-600'
                                : 'bg-sky-50 text-sky-600'
                            }`}
                          >
                            {trade.status || 'active'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* NEWS */}
        <div
          className="animate-fade-in"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-sky-500" />

            <h3 className="font-heading text-lg font-bold text-gray-800">
              Market News
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_NEWS.map((article, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm border border-sky-100 p-5 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-600 text-xs font-medium border border-sky-200">
                    {article.tag}
                  </span>

                  <span className="text-gray-400 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3 text-sky-400" />
                    {article.time}
                  </span>
                </div>

                <h4 className="text-gray-800 font-semibold text-sm leading-snug mb-2 group-hover:text-sky-500 transition-colors">
                  {article.title}
                </h4>

                <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
                  {article.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
