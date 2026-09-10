import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Diamond,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  Landmark,
  Gift,
  ArrowUpRight,
  Headphones,
  BarChart3,
  Wallet,
  UserPlus,
  Timer,
  Users,
  CheckCircle2,
  Menu,
  X,
  Send,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatNumber } from '../lib/utils';

const COIN_META = {
  BTC: { name: 'Bitcoin', color: 'from-orange-400 to-amber-600' },
  ETH: { name: 'Ethereum', color: 'from-indigo-400 to-blue-600' },
  BNB: { name: 'BNB', color: 'from-yellow-400 to-amber-600' },
  SOL: { name: 'Solana', color: 'from-purple-400 to-violet-600' },
  XRP: { name: 'XRP', color: 'from-sky-400 to-blue-600' },
  DOGE: { name: 'Dogecoin', color: 'from-amber-400 to-yellow-600' },
  ADA: { name: 'Cardano', color: 'from-blue-400 to-cyan-600' },
  DOT: { name: 'Polkadot', color: 'from-rose-400 to-pink-600' },
};

const FEATURES = [
  { icon: BarChart3, title: 'Crypto Trading', desc: 'Trade Bitcoin, Ethereum and 6+ assets with lightning-fast execution and a simple buy/sell interface.' },
  { icon: Landmark, title: 'India Bank Deposits', desc: 'Deposit directly via NEFT/UPI in INR. Your USDT is credited instantly at a transparent fixed rate.' },
  { icon: Wallet, title: 'Bank Withdrawals', desc: 'Withdraw to your own bank account in INR. Save your bank once and request payouts in seconds.' },
  { icon: Gift, title: 'Referral Rewards', desc: 'Earn a $5 bonus for every friend you refer. Share your code and grow your earnings.' },
  { icon: ShieldCheck, title: 'Bank-Grade Security', desc: 'Protected accounts, identity verification and manual review of every transaction for your safety.' },
  { icon: Headphones, title: '24/7 Support', desc: 'Our support team is always online to help you with deposits, withdrawals and trading questions.' },
];

const STEPS = [
  { icon: UserPlus, step: '01', title: 'Create Account', desc: 'Sign up in under a minute with just your name, email and phone number. Referral codes welcome.' },
  { icon: Landmark, step: '02', title: 'Deposit INR', desc: 'Pay via NEFT/UPI into our registered bank account. Your balance is credited as USDT instantly.' },
  { icon: BarChart3, step: '03', title: 'Start Trading', desc: 'Predict the market on BTC, ETH and more. Win up to your profit percentage on every trade.' },
];

const NAV_LINKS = [
  { href: '#markets', label: 'Markets' },
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#support', label: 'Support' },
];

export default function Home() {
  const [prices, setPrices] = useState({});
  const [pricesOk, setPricesOk] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [supportTelegram, setSupportTelegram] = useState('GeminieSupportBot');

  useEffect(() => {
    let alive = true;
    api.get('/settings/public')
      .then(({ data }) => { if (alive && data?.support_telegram) setSupportTelegram(data.support_telegram); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const fetchPrices = async () => {
      try {
        const { data } = await api.get('/prices/public');
        if (alive && data && Object.keys(data).length > 0) {
          setPrices(data);
          setPricesOk(true);
        }
      } catch {
        setPricesOk(false);
      }
    };
    fetchPrices();
    const timer = setInterval(fetchPrices, 20000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  const coins = Object.keys(COIN_META);
  const totalVolume = coins.reduce((sum, c) => sum + (prices[c]?.volume_24h || 0), 0);

  const CoinIcon = ({ symbol, className = 'w-10 h-10' }) => {
    const meta = COIN_META[symbol] || { name: symbol, color: 'from-sky-400 to-sky-600' };
    const initial = (meta.name || symbol)[0];
    return (
      <div className={`${className} rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white font-bold flex-shrink-0`}>
        {initial}
      </div>
    );
  };

  const Change = ({ value, className = '' }) => {
    if (value === undefined || value === null || isNaN(value)) {
      return <span className={`text-gray-400 ${className}`}>--</span>;
    }
    const up = value >= 0;
    return (
      <span className={`${up ? 'text-emerald-600' : 'text-red-500'} ${className}`}>
        {up ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
              <Diamond className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading text-lg font-bold text-sky-600">Gemini Exchange</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-gray-500 hover:text-sky-600 transition-colors">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:text-sky-600 hover:bg-sky-50 transition-colors">
              Log In
            </Link>
            <Link to="/register" className="px-4 py-2 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors">
              Get Started
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg text-gray-500 hover:text-sky-600 hover:bg-sky-50 transition-colors">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-sky-100 bg-white px-4 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-600 py-2">
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-sky-100">
              <Link to="/login" className="flex-1 text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Log In
              </Link>
              <Link to="/register" className="flex-1 text-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="pt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-10 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-600 text-xs font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              India-first crypto trading — NEFT/UPI supported
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-gray-900 leading-tight max-w-4xl mx-auto">
              Trade Crypto with <span className="text-sky-500">Confidence</span>
            </h1>
            <p className="text-gray-500 text-base md:text-lg mt-5 max-w-2xl mx-auto">
              Deposit INR via your bank, get USDT instantly, and trade Bitcoin &amp; Ethereum on a secure, verified platform built for India.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link to="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold transition-colors">
                Start Trading
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-sky-200 hover:bg-sky-50 text-sky-600 font-semibold transition-colors">
                Log In
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-10 text-sm text-gray-400">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Identity verified users</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Manual admin review</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Fixed INR conversion rate</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 pb-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {coins.slice(0, 4).map((c) => (
              <div key={c} className="bg-gradient-to-br from-gray-50 to-white border border-sky-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                <CoinIcon symbol={c} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{COIN_META[c].name} <span className="text-gray-400 font-medium">{c}</span></p>
                  <p className="text-gray-800 font-bold mt-1">{formatCurrency(prices[c]?.price || 0)}</p>
                  <Change value={prices[c]?.change_24h} className="text-xs" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-800 gap-6 lg:gap-0">
            <div className="text-center lg:text-left lg:pr-6">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">24h Volume</p>
              <p className="font-heading text-2xl font-bold">
                {pricesOk ? `$${formatNumber(totalVolume)}` : '$1.2B+'}
              </p>
            </div>
            <div className="text-center lg:text-left lg:px-6">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Supported Assets</p>
              <p className="font-heading text-2xl font-bold">8</p>
            </div>
            <div className="text-center lg:text-left lg:px-6">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Deposit Method</p>
              <p className="font-heading text-2xl font-bold flex items-center justify-center lg:justify-start gap-2"><Landmark className="w-6 h-6 text-sky-400" /> NEFT / UPI</p>
            </div>
            <div className="text-center lg:text-left lg:pl-6">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Customer Support</p>
              <p className="font-heading text-2xl font-bold flex items-center justify-center lg:justify-start gap-2"><Timer className="w-6 h-6 text-sky-400" /> 24/7</p>
            </div>
          </div>
        </div>
      </section>

      <section id="markets" className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sky-600 text-xs font-semibold uppercase tracking-wider mb-2">Live Markets</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900">Top cryptocurrencies</h2>
          </div>
          <Link to="/register" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700">
            Start trading <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {coins.map((c) => (
            <div key={c} className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-sky-200 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CoinIcon symbol={c} className="w-9 h-9" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{COIN_META[c].name}</p>
                    <p className="text-gray-400 text-xs">{c}/USDT</p>
                  </div>
                </div>
                <Change value={prices[c]?.change_24h} className="text-xs" />
              </div>
              <p className="font-heading text-xl font-bold text-gray-900">{formatCurrency(prices[c]?.price || 0)}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-gray-400 text-xs">24h Vol</span>
                <span className="text-gray-600 text-xs font-medium">{pricesOk ? `$${formatNumber(prices[c]?.volume_24h || 0)}` : '--'}</span>
              </div>
            </div>
          ))}
        </div>

        {!pricesOk && (
          <p className="text-center text-gray-400 text-xs mt-4">
            Live prices unavailable at the moment — showing placeholder values.
          </p>
        )}
      </section>

      <section id="features" className="bg-gray-50 border-y border-sky-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <p className="text-sky-600 text-xs font-semibold uppercase tracking-wider mb-2">Features</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900">Everything you need to trade</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-sky-500" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <p className="text-sky-600 text-xs font-semibold uppercase tracking-wider mb-2">How it works</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900">Start in three simple steps</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="relative bg-gradient-to-br from-white to-sky-50/40 border border-sky-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-heading text-4xl font-bold text-sky-100">{s.step}</span>
                </div>
                <h3 className="font-heading text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="support" className="max-w-7xl mx-auto px-4 md:px-6 pb-16 md:pb-20">
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl px-6 md:px-12 py-12 md:py-16 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <Diamond className="w-10 h-10 text-white/80 mx-auto mb-4" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">Ready to start trading?</h2>
            <p className="text-sky-100 text-base mt-3 max-w-xl mx-auto">
              Create your free account and make your first INR deposit today. Support is available 24/7.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-sky-600 font-bold mt-8 hover:bg-sky-50 transition-colors">
              Create Free Account
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <div className="mt-6">
              <a
                href={`https://t.me/${String(supportTelegram).replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold mt-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                Chat on Telegram
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-sky-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
                  <Diamond className="w-4 h-4 text-white" />
                </div>
                <span className="font-heading text-base font-bold text-sky-600">Gemini Exchange</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                A secure crypto trading platform with India bank deposits and withdrawals via NEFT/UPI.
              </p>
            </div>
            <div>
              <h4 className="text-gray-900 text-sm font-semibold mb-3">Platform</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><a href="#markets" className="hover:text-sky-600 transition-colors">Markets</a></li>
                <li><a href="#features" className="hover:text-sky-600 transition-colors">Features</a></li>
                <li><Link to="/dashboard/trade" className="hover:text-sky-600 transition-colors">Trade</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 text-sm font-semibold mb-3">Account</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><Link to="/register" className="hover:text-sky-600 transition-colors">Create Account</Link></li>
                <li><Link to="/login" className="hover:text-sky-600 transition-colors">Log In</Link></li>
                <li><Link to="/dashboard/profile" className="hover:text-sky-600 transition-colors">Profile</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 text-sm font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Referral Program</li>
                <li><a href={`https://t.me/${String(supportTelegram).replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-sky-600 transition-colors"><Headphones className="w-3.5 h-3.5" /> Chat Support</a></li>
                <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Security</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-sky-100 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-gray-400 text-xs">© {new Date().getFullYear()} Gemini Exchange. All rights reserved.</p>
            <p className="text-gray-400 text-xs flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5" /> Deposits &amp; withdrawals in INR via NEFT / UPI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}