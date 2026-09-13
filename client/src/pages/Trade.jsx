import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Trophy,
  XCircle,
  AlertTriangle,
  Crown,
  Loader2,
  RefreshCw,
  ChevronDown,
  CandlestickChart,
} from 'lucide-react';

import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
} from 'lightweight-charts';

import { formatCurrency } from '../lib/utils';

const CRYPTO_CONFIG = {
  BTC: {
    color: 'text-amber-500',
    bg: 'bg-amber-500',
    label: 'Bitcoin',
    coinId: 'bitcoin',
  },
  ETH: {
    color: 'text-blue-500',
    bg: 'bg-blue-500',
    label: 'Ethereum',
    coinId: 'ethereum',
  },
  BNB: {
    color: 'text-yellow-500',
    bg: 'bg-yellow-500',
    label: 'BNB',
    coinId: 'binancecoin',
  },
  SOL: {
    color: 'text-purple-500',
    bg: 'bg-purple-500',
    label: 'Solana',
    coinId: 'solana',
  },
  XRP: {
    color: 'text-slate-400',
    bg: 'bg-slate-400',
    label: 'XRP',
    coinId: 'ripple',
  },
  DOGE: {
    color: 'text-orange-500',
    bg: 'bg-orange-500',
    label: 'Dogecoin',
    coinId: 'dogecoin',
  },
  ADA: {
    color: 'text-sky-500',
    bg: 'bg-sky-500',
    label: 'Cardano',
    coinId: 'cardano',
  },
  DOT: {
    color: 'text-pink-500',
    bg: 'bg-pink-500',
    label: 'Polkadot',
    coinId: 'polkadot',
  },
};

const STANDARD_DURATIONS = [
  { seconds: 30, profit: 30 },
  { seconds: 60, profit: 40 },
  { seconds: 120, profit: 50 },
  { seconds: 180, profit: 60 },
];

const PREMIUM_DURATIONS = [
  { seconds: 30, profit: 72 },
  { seconds: 60, profit: 76 },
  { seconds: 120, profit: 80 },
  { seconds: 180, profit: 82 },
];

const QUICK_AMOUNTS = [10, 25, 50, 100];

function getDurationLabel(seconds) {
  if (seconds >= 60) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function formatPrice(price) {
  if (!price) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: price < 1 ? 5 : 2,
  }).format(price);
}

function getStatusBadge(status) {
  switch (status) {
    case 'active':
      return 'bg-amber-50 text-amber-600 border-amber-200';

    case 'won':
      return 'bg-emerald-50 text-emerald-600 border-emerald-200';

    case 'lost':
      return 'bg-red-50 text-red-600 border-red-200';

    default:
      return 'bg-gray-50 text-gray-500 border-gray-200';
  }
}

function getTradeDate(trade) {
  if (trade.createdAt) {
    return new Date(trade.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return '-';
}

function getTradeId(trade) {
  return trade._id || trade.id;
}

export default function Trade() {
  const { user, updateUser } = useAuth();

  const [prices, setPrices] = useState({});
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [showDropdown, setShowDropdown] = useState(false);
  const [direction, setDirection] = useState('buy');
  const [duration, setDuration] = useState(null);
  const [durationType, setDurationType] = useState('standard');
  const [amount, setAmount] = useState('');
  const [activeTrades, setActiveTrades] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [countdowns, setCountdowns] = useState({});
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(false);
  const [message, setMessage] = useState(null);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const countdownRef = useRef({});
  const dropdownRef = useRef(null);

  const currentPrices = prices[selectedCrypto] || {};

  const currentPrice =
    currentPrices.price ?? currentPrices.last ?? 0;

  const change24h =
    currentPrices.change_24h ?? currentPrices.change ?? 0;

  const isPositive = change24h >= 0;

  const selectedDurations =
    durationType === 'premium'
      ? PREMIUM_DURATIONS
      : STANDARD_DURATIONS;

  const selectedDurationData =
    duration !== null
      ? selectedDurations.find((d) => d.seconds === duration)
      : null;

  const amountNum = parseFloat(amount) || 0;

  const profitPercent =
    selectedDurationData?.profit || 0;

  const potentialProfit =
    amountNum * (profitPercent / 100);

  const totalReturn =
    amountNum + potentialProfit;

  const selectedConfig =
    CRYPTO_CONFIG[selectedCrypto];

  const fetchPrices = useCallback(async () => {
    try {
      const { data } = await api.get('/prices/prices');
      setPrices(data);
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    }
  }, []);

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);

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
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * ==============================
   * CANDLESTICK CHART
   * ==============================
   */

  function renderCandlestickChart(ohlcData) {
    const container = chartContainerRef.current;

    if (!container) {
      console.warn('Chart container not available');
      return;
    }

    if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
      setChartError(true);
      return;
    }

    setChartError(false);

    /*
     * Create chart only once
     */
    if (!chartRef.current) {
      const chart = createChart(container, {
        width: container.clientWidth,
        height: 320,

        layout: {
          background: {
            type: ColorType.Solid,
            color: 'transparent',
          },
          textColor: '#9ca3af',
          fontSize: 11,
        },

        grid: {
          vertLines: {
            color: 'rgba(226, 232, 240, 0.4)',
          },
          horzLines: {
            color: 'rgba(226, 232, 240, 0.4)',
          },
        },

        crosshair: {
          mode: CrosshairMode.Normal,
        },

        rightPriceScale: {
          borderColor: 'rgba(226, 232, 240, 0.5)',
        },

        timeScale: {
          borderColor: 'rgba(226, 232, 240, 0.5)',
          timeVisible: true,
          secondsVisible: false,
        },

        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },

        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      /*
       * lightweight-charts v5 API
       */
      const candleSeries = chart.addSeries(
        CandlestickSeries,
        {
          upColor: '#10b981',
          downColor: '#ef4444',

          borderUpColor: '#10b981',
          borderDownColor: '#ef4444',

          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',

          borderVisible: false,
        }
      );

      candleSeriesRef.current = candleSeries;
      chartRef.current = chart;

      /*
       * Responsive chart
       */
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserverRef.current =
          new ResizeObserver((entries) => {
            if (!entries.length) return;

            const { width } = entries[0].contentRect;

            if (
              chartRef.current &&
              width > 0
            ) {
              chartRef.current.applyOptions({
                width,
              });
            }
          });

        resizeObserverRef.current.observe(container);
      }
    }

    /*
     * Convert API OHLC data into chart data
     *
     * Expected:
     * [
     *   timestamp,
     *   open,
     *   high,
     *   low,
     *   close
     * ]
     */
    const candles = ohlcData
      .map((point) => {
        // Backend /prices/ohlc returns objects:
        // { time, open, high, low, close }
        // Also accept array format for compatibility.
        const timestamp = Array.isArray(point)
          ? Number(point[0])
          : Number(point?.time);

        const open = Array.isArray(point)
          ? Number(point[1])
          : Number(point?.open);

        const high = Array.isArray(point)
          ? Number(point[2])
          : Number(point?.high);

        const low = Array.isArray(point)
          ? Number(point[3])
          : Number(point?.low);

        const close = Array.isArray(point)
          ? Number(point[4])
          : Number(point?.close);

        if (
          !Number.isFinite(timestamp) ||
          !Number.isFinite(open) ||
          !Number.isFinite(high) ||
          !Number.isFinite(low) ||
          !Number.isFinite(close)
        ) {
          return null;
        }

        // Binance backend returns seconds.
        // If milliseconds are ever returned, normalize them too.
        const time = timestamp > 100000000000
          ? Math.floor(timestamp / 1000)
          : Math.floor(timestamp);

        return {
          time,
          open,
          high,
          low,
          close,
        };
      })
      .filter(Boolean);

    /*
     * Remove duplicate timestamps
     * and sort oldest -> newest.
     */
    const uniqueCandles = Array.from(
      new Map(
        candles.map((candle) => [
          candle.time,
          candle,
        ])
      ).values()
    ).sort((a, b) => a.time - b.time);

    if (
      uniqueCandles.length === 0 ||
      !candleSeriesRef.current
    ) {
      setChartError(true);
      return;
    }

    try {
      candleSeriesRef.current.setData(
        uniqueCandles
      );

      chartRef.current
        ?.timeScale()
        .fitContent();

      setChartError(false);
    } catch (err) {
      console.error(
        'Failed to render candlestick data:',
        err
      );

      setChartError(true);
    }
  }

  const fetchChartData = useCallback(async () => {
    try {
      setChartLoading(true);
      setChartError(false);

      const coinId =
        CRYPTO_CONFIG[selectedCrypto].coinId;

      const { data } = await api.get(
        `/prices/ohlc/${coinId}?interval=15m&limit=96`
      );

      if (
        Array.isArray(data) &&
        data.length > 0
      ) {
        renderCandlestickChart(data);
      } else {
        setChartError(true);
      }
    } catch (err) {
      console.error(
        'Failed to fetch OHLC data:',
        err
      );

      setChartError(true);
    } finally {
      setChartLoading(false);
    }
  }, [selectedCrypto]);

  /*
   * ==============================
   * INITIAL DATA
   * ==============================
   */

  useEffect(() => {
    fetchPrices();
    fetchTrades();

    const priceInterval =
      setInterval(fetchPrices, 10000);

    return () => {
      clearInterval(priceInterval);

      Object.values(
        countdownRef.current
      ).forEach(clearInterval);

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      candleSeriesRef.current = null;
    };
  }, [fetchPrices, fetchTrades]);

  /*
   * ==============================
   * CHART FETCH
   * ==============================
   */

  useEffect(() => {
    fetchChartData();
    setShowDropdown(false);
  }, [selectedCrypto, fetchChartData]);

  /*
   * ==============================
   * DROPDOWN
   * ==============================
   */

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  /*
   * ==============================
   * COUNTDOWNS
   * ==============================
   */

  useEffect(() => {
    Object.values(
      countdownRef.current
    ).forEach(clearInterval);

    countdownRef.current = {};

    activeTrades.forEach((trade) => {
      if (trade.status === 'active') {
        startCountdown(trade);
      }
    });
  }, [activeTrades]);

  function startCountdown(trade) {
    const tradeId = getTradeId(trade);

    const endTime = new Date(
      trade.expires_at ||
        trade.expiresAt
    ).getTime();

    countdownRef.current[tradeId] =
      setInterval(() => {
        const now = Date.now();

        const remaining = Math.max(
          0,
          Math.ceil(
            (endTime - now) / 1000
          )
        );

        setCountdowns((prev) => ({
          ...prev,
          [tradeId]: remaining,
        }));

        if (remaining <= 0) {
          clearInterval(
            countdownRef.current[tradeId]
          );

          delete countdownRef.current[
            tradeId
          ];

          resolveTrade(tradeId);
        }
      }, 1000);
  }

  async function resolveTrade(tradeId) {
    try {
      await api.post(
        `/trades/${tradeId}/resolve`
      );

      fetchTrades();
    } catch (err) {
      console.error(
        'Failed to resolve trade:',
        err
      );
    }
  }

  /*
   * ==============================
   * PLACE ORDER
   * ==============================
   */

  async function handlePlaceOrder() {
    if (
      !amountNum ||
      !duration ||
      !selectedCrypto ||
      placing
    ) {
      return;
    }

    setMessage(null);

    try {
      setPlacing(true);

      await api.post('/trades', {
        crypto: selectedCrypto,
        direction,
        amount: amountNum,
        duration,
      });

      setAmount('');
      setDuration(null);

      setMessage({
        type: 'success',
        text: 'Trade placed successfully!',
      });

      fetchTrades();

      if (updateUser) {
        const { data } =
          await api.get('/auth/me');

        updateUser(data);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Failed to place order';

      setMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setPlacing(false);
    }
  }

  /*
   * ==============================
   * TRADE HELPERS
   * ==============================
   */

  function getTradePnlPercent(trade) {
    if (!trade.entry_price) return 0;

    if (trade.profit_loss !== undefined) {
      return (
        (trade.profit_loss /
          trade.amount) *
        100
      );
    }

    if (trade.exit_price) {
      const change =
        ((trade.exit_price -
          trade.entry_price) /
          trade.entry_price) *
        100;

      return trade.direction === 'sell'
        ? -change
        : change;
    }

    const curr =
      getTradeCurrentPrice(trade);

    if (!curr) return 0;

    const change =
      ((curr - trade.entry_price) /
        trade.entry_price) *
      100;

    return trade.direction === 'sell'
      ? -change
      : change;
  }

  function getTradeCurrentPrice(trade) {
    if (trade.exit_price) {
      return trade.exit_price;
    }

    const priceData =
      prices[trade.crypto];

    return (
      priceData?.price ??
      priceData?.last ??
      0
    );
  }

  function getProgressPercent(trade) {
    const totalDuration =
      trade.duration || 60;

    const remaining =
      countdowns[getTradeId(trade)] || 0;

    return (
      ((totalDuration - remaining) /
        totalDuration) *
      100
    );
  }

  /*
   * ==============================
   * UI
   * ==============================
   */

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">

        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 font-heading">
            <span className="text-sky-500">
              Trade
            </span>{' '}
            Crypto
          </h1>

          <p className="text-gray-400 text-sm mt-1">
            Select an asset and place your trade
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">

            {/* ASSET SELECTOR */}
            <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Select Asset
                </p>
              </div>

              <div
                className="relative"
                ref={dropdownRef}
              >
                <button
                  onClick={() =>
                    setShowDropdown(
                      !showDropdown
                    )
                  }
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all"
                >
                  <div className="flex items-center gap-3">

                    <div
                      className={`w-9 h-9 rounded-full ${selectedConfig.bg} flex items-center justify-center text-white text-sm font-bold shadow-sm`}
                    >
                      {selectedCrypto.slice(
                        0,
                        2
                      )}
                    </div>

                    <div className="text-left">
                      <p className="text-gray-800 font-bold">
                        {selectedCrypto}/USDT
                      </p>

                      <p className="text-gray-400 text-xs">
                        {selectedConfig.label}
                      </p>
                    </div>

                    {currentPrice > 0 && (
                      <span
                        className={`ml-3 text-sm font-bold ${
                          isPositive
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {isPositive
                          ? '+'
                          : ''}
                        {typeof change24h ===
                        'number'
                          ? change24h.toFixed(
                              2
                            )
                          : '0.00'}
                        %
                      </span>
                    )}
                  </div>

                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      showDropdown
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                </button>

                {showDropdown && (
                  <div className="absolute z-30 mt-2 w-full bg-white rounded-xl shadow-xl border border-sky-100 overflow-hidden animate-fade-in">

                    {Object.entries(
                      CRYPTO_CONFIG
                    ).map(
                      ([symbol, cfg]) => (
                        <button
                          key={symbol}
                          onClick={() =>
                            setSelectedCrypto(
                              symbol
                            )
                          }
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors ${
                            selectedCrypto ===
                            symbol
                              ? 'bg-sky-50/70 border-l-4 border-sky-500'
                              : ''
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center text-white text-xs font-bold`}
                          >
                            {symbol.slice(
                              0,
                              2
                            )}
                          </div>

                          <div className="text-left flex-1">
                            <p className="text-gray-800 font-semibold text-sm">
                              {symbol}/USDT
                            </p>

                            <p className="text-gray-400 text-xs">
                              {cfg.label}
                            </p>
                          </div>

                          {prices[symbol]
                            ?.price >
                            0 && (
                            <div className="text-right">
                              <p className="text-gray-800 font-semibold text-sm">
                                {formatPrice(
                                  prices[
                                    symbol
                                  ].price
                                )}
                              </p>

                              <p
                                className={`text-xs font-medium ${
                                  prices[
                                    symbol
                                  ]
                                    .change_24h >=
                                  0
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {prices[
                                  symbol
                                ]
                                  .change_24h >=
                                0
                                  ? '+'
                                  : ''}
                                {typeof prices[
                                  symbol
                                ]
                                  .change_24h ===
                                'number'
                                  ? prices[
                                      symbol
                                    ].change_24h.toFixed(
                                      2
                                    )
                                  : '0.00'}
                                %
                              </p>
                            </div>
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PRICE DISPLAY */}
            <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Live Price
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl md:text-3xl font-bold text-gray-800 font-mono tabular-nums">
                      {currentPrice > 0
                        ? formatPrice(
                            currentPrice
                          )
                        : '$0.00'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">

                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                      isPositive
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}

                    <span
                      className={`text-sm font-semibold ${
                        isPositive
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {isPositive
                        ? '+'
                        : ''}
                      {typeof change24h ===
                      'number'
                        ? change24h.toFixed(2)
                        : '0.00'}
                      %
                    </span>
                  </div>

                  <div
                    className={`w-10 h-10 rounded-xl ${selectedConfig.bg} flex items-center justify-center text-white font-bold shadow-sm`}
                  >
                    {selectedCrypto.slice(
                      0,
                      2
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CANDLESTICK CHART */}
            <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">

              <div className="flex items-center justify-between mb-3 px-2">

                <div className="flex items-center gap-2">
                  <CandlestickChart className="w-5 h-5 text-sky-500" />

                  <p className="text-sm font-bold text-gray-800">
                    {selectedCrypto}/USDT{' '}
                    <span className="text-gray-400 font-normal text-xs">
                      · 1 Day · Candle Chart
                    </span>
                  </p>
                </div>

                <button
                  onClick={fetchChartData}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Refresh chart"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-gray-400 ${
                      chartLoading
                        ? 'animate-spin'
                        : ''
                    }`}
                  />
                </button>
              </div>

              {/* IMPORTANT:
                  Chart container is ALWAYS rendered.
                  Loading is now an overlay.
              */}
              <div className="relative w-full h-[320px]">

                <div
                  ref={chartContainerRef}
                  className="w-full h-[320px]"
                />

                {chartLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />

                      <span className="text-xs text-gray-400">
                        Loading chart...
                      </span>
                    </div>
                  </div>
                )}

                {!chartLoading &&
                  chartError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                      <div className="flex flex-col items-center text-center">
                        <AlertTriangle className="w-6 h-6 text-gray-300 mb-2" />

                        <p className="text-gray-400 text-sm">
                          No chart data available
                        </p>

                        <button
                          onClick={
                            fetchChartData
                          }
                          className="mt-2 text-xs text-sky-500 hover:text-sky-600 font-semibold"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* ACTIVE TRADES */}
            {activeTrades.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">

                <div className="flex items-center justify-between mb-4">

                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-sky-500" />

                    <h3 className="text-lg font-bold text-gray-800 font-heading">
                      Active Trades
                    </h3>
                  </div>

                  <button
                    onClick={fetchTrades}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-3">

                  {activeTrades.map(
                    (trade) => {
                      const tradeId =
                        getTradeId(
                          trade
                        );

                      const remaining =
                        countdowns[
                          tradeId
                        ] || 0;

                      const pnlPercent =
                        getTradePnlPercent(
                          trade
                        );

                      const progress =
                        getProgressPercent(
                          trade
                        );

                      const isUrgent =
                        remaining <
                          10 &&
                        remaining >
                          0;

                      const isUp =
                        pnlPercent >= 0;

                      return (
                        <div
                          key={tradeId}
                          className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3"
                        >

                          <div className="flex items-center justify-between">

                            <div className="flex items-center gap-3">

                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                                  trade.direction ===
                                  'buy'
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                    : 'bg-red-50 text-red-600 border border-red-200'
                                }`}
                              >
                                {trade.direction ===
                                'buy' ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}

                                {trade.direction?.toUpperCase()}
                              </span>

                              <span className="text-gray-800 font-semibold text-sm">
                                {trade.crypto}/USDT
                              </span>
                            </div>

                            <div
                              className={`flex items-center gap-1.5 ${
                                isUrgent
                                  ? 'text-red-600'
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

                              <span className="text-sm font-mono font-semibold">
                                {remaining}s
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                isUp
                                  ? 'bg-sky-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${Math.min(
                                  progress,
                                  100
                                )}%`,
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-4 gap-3">

                            <div>
                              <p className="text-gray-400 text-xs mb-0.5">
                                Amount
                              </p>

                              <p className="text-gray-800 text-sm font-semibold">
                                {formatCurrency(
                                  trade.amount ||
                                    0
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-400 text-xs mb-0.5">
                                Entry
                              </p>

                              <p className="text-gray-800 text-sm font-semibold">
                                {trade.entry_price
                                  ? formatPrice(
                                      trade.entry_price
                                    )
                                  : '-'}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-400 text-xs mb-0.5">
                                Current
                              </p>

                              <p className="text-gray-800 text-sm font-semibold">
                                {getTradeCurrentPrice(
                                  trade
                                )
                                  ? formatPrice(
                                      getTradeCurrentPrice(
                                        trade
                                      )
                                    )
                                  : '-'}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-400 text-xs mb-0.5">
                                P/L
                              </p>

                              <p
                                className={`text-sm font-semibold ${
                                  isUp
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {isUp
                                  ? '+'
                                  : ''}
                                {pnlPercent.toFixed(
                                  2
                                )}
                                %
                              </p>
                            </div>

                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* TRADE HISTORY */}
            <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">

              <div className="flex items-center justify-between mb-4">

                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-sky-500" />

                  <h3 className="text-lg font-bold text-gray-800 font-heading">
                    Trade History
                  </h3>
                </div>

                <button
                  onClick={fetchTrades}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {tradeHistory.length === 0 &&
              !loading ? (
                <div className="text-center py-10">

                  <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />

                  <p className="text-gray-400 text-sm">
                    No trade history yet
                  </p>

                  <p className="text-gray-300 text-xs mt-1">
                    Your completed trades will appear here
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full text-sm">

                    <thead>
                      <tr className="border-b border-gray-100">

                        <th className="text-left py-3 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          Crypto
                        </th>

                        <th className="text-left py-3 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          Direction
                        </th>

                        <th className="text-right py-3 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          Amount
                        </th>

                        <th className="text-right py-3 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          Entry
                        </th>

                        <th className="text-right py-3 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          Exit
                        </th>

                        <th className="text-right py-3 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          P/L
                        </th>

                        <th className="text-center py-3 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          Status
                        </th>

                        <th className="text-right py-3 px-2 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          Date
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {tradeHistory.map(
                        (trade) => {
                          const pnl =
                            trade.profit_loss ??
                            (
                              (trade.exit_price ||
                                0) -
                              (trade.entry_price ||
                                0)
                            ) *
                              (trade.direction ===
                              'buy'
                                ? 1
                                : -1);

                          return (
                            <tr
                              key={getTradeId(
                                trade
                              )}
                              className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                            >

                              <td className="py-3 px-2">
                                <span className="text-gray-800 font-medium">
                                  {trade.crypto}/USDT
                                </span>
                              </td>

                              <td className="py-3 px-2">
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                    trade.direction ===
                                    'buy'
                                      ? 'text-emerald-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {trade.direction ===
                                  'buy' ? (
                                    <ArrowUpRight className="w-3 h-3" />
                                  ) : (
                                    <ArrowDownRight className="w-3 h-3" />
                                  )}

                                  {trade.direction?.toUpperCase()}
                                </span>
                              </td>

                              <td className="py-3 px-2 text-right text-gray-800 font-medium">
                                {formatCurrency(
                                  trade.amount ||
                                    0
                                )}
                              </td>

                              <td className="py-3 px-2 text-right text-gray-800 font-medium">
                                {trade.entry_price
                                  ? formatPrice(
                                      trade.entry_price
                                    )
                                  : '-'}
                              </td>

                              <td className="py-3 px-2 text-right text-gray-800 font-medium">
                                {trade.exit_price
                                  ? formatPrice(
                                      trade.exit_price
                                    )
                                  : '-'}
                              </td>

                              <td
                                className={`py-3 px-2 text-right font-semibold ${
                                  pnl >= 0
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {pnl >= 0
                                  ? '+'
                                  : ''}
                                {formatCurrency(
                                  pnl
                                )}
                              </td>

                              <td className="py-3 px-2 text-center">

                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                                    trade.status
                                  )}`}
                                >
                                  {trade.status ===
                                  'won' ? (
                                    <Trophy className="w-3 h-3 mr-1" />
                                  ) : trade.status ===
                                    'lost' ? (
                                    <XCircle className="w-3 h-3 mr-1" />
                                  ) : null}

                                  {trade.status
                                    ?.charAt(
                                      0
                                    )
                                    .toUpperCase() +
                                    trade.status?.slice(
                                      1
                                    )}
                                </span>

                              </td>

                              <td className="py-3 px-2 text-right text-gray-400 text-xs">
                                {getTradeDate(
                                  trade
                                )}
                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* TRADE FORM */}
          <div className="lg:col-span-1">

            <div className="sticky top-4 space-y-6">

              <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-5">

                <div className="flex items-center justify-between mb-5">

                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Trade Form
                  </p>

                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-50 border border-sky-200">

                    <Crown className="w-3.5 h-3.5 text-sky-500" />

                    <span className="text-sky-600 text-xs font-semibold">
                      {selectedCrypto}/USDT
                    </span>

                  </div>
                </div>

                <div className="mb-5 p-3 rounded-xl bg-gray-50 border border-gray-100">

                  <p className="text-gray-400 text-xs mb-1">
                    Available Balance
                  </p>

                  <p className="text-xl font-bold text-gray-800">
                    {formatCurrency(
                      user?.balance ?? 0
                    )}
                  </p>
                </div>

                {/* DIRECTION */}
                <div className="mb-5">

                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Direction
                  </p>

                  <div className="grid grid-cols-2 gap-2">

                    <button
                      onClick={() =>
                        setDirection('buy')
                      }
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all ${
                        direction === 'buy'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600 ring-1 ring-emerald-200'
                          : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      BUY (Up)
                    </button>

                    <button
                      onClick={() =>
                        setDirection('sell')
                      }
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all ${
                        direction === 'sell'
                          ? 'bg-red-50 border-red-200 text-red-600 ring-1 ring-red-200'
                          : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" />
                      SELL (Down)
                    </button>

                  </div>
                </div>

                {/* DURATION */}
                <div className="mb-5">

                  <div className="flex items-center justify-between mb-2">

                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Duration
                    </p>

                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 border border-gray-200">

                      <button
                        onClick={() => {
                          setDurationType(
                            'standard'
                          );
                          setDuration(null);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          durationType ===
                          'standard'
                            ? 'bg-white text-sky-600 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        Standard
                      </button>

                      <button
                        onClick={() => {
                          setDurationType(
                            'premium'
                          );
                          setDuration(null);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          durationType ===
                          'premium'
                            ? 'bg-white text-sky-600 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        Premium
                      </button>

                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">

                    {selectedDurations.map(
                      (d) => (
                        <button
                          key={d.seconds}
                          onClick={() =>
                            setDuration(
                              d.seconds
                            )
                          }
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                            duration ===
                            d.seconds
                              ? 'ring-2 ring-sky-500 bg-sky-50 border-sky-200'
                              : 'bg-gray-50 border-gray-100 hover:border-sky-300'
                          }`}
                        >

                          <div className="flex items-center gap-1">

                            <Clock className="w-3 h-3 text-gray-400" />

                            <span className="text-gray-800 text-sm font-semibold">
                              {getDurationLabel(
                                d.seconds
                              )}
                            </span>

                          </div>

                          <span className="text-emerald-600 text-xs font-bold">
                            +{d.profit}%
                          </span>

                        </button>
                      )
                    )}

                  </div>
                </div>

                {/* AMOUNT */}
                <div className="mb-5">

                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Amount
                  </p>

                  <div className="relative mb-2">

                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                      $
                    </span>

                    <input
                      type="number"
                      value={amount}
                      onChange={(e) =>
                        setAmount(
                          e.target.value
                        )
                      }
                      placeholder="0.00"
                      min="1"
                      step="1"
                      className="w-full pl-7 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-lg font-semibold placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-300 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">

                    {QUICK_AMOUNTS.map(
                      (qa) => (
                        <button
                          key={qa}
                          onClick={() =>
                            setAmount(
                              String(qa)
                            )
                          }
                          className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                            amountNum === qa
                              ? 'bg-sky-50 border-sky-200 text-sky-600'
                              : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-sky-50 hover:border-sky-200'
                          }`}
                        >
                          ${qa}
                        </button>
                      )
                    )}

                  </div>
                </div>

                {/* PROFIT */}
                {amountNum > 0 &&
                  selectedDurationData && (
                    <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">

                      <div className="flex items-center justify-between">

                        <span className="text-gray-500 text-xs">
                          Potential Profit (
                          {
                            selectedDurationData.profit
                          }
                          %)
                        </span>

                        <span className="text-emerald-600 font-semibold text-sm">
                          +
                          {formatCurrency(
                            potentialProfit
                          )}
                        </span>

                      </div>

                      <div className="flex items-center justify-between">

                        <span className="text-gray-500 text-xs">
                          Total Return
                        </span>

                        <span className="text-gray-800 font-bold text-sm">
                          {formatCurrency(
                            totalReturn
                          )}
                        </span>

                      </div>

                    </div>
                  )}

                {/* PLACE ORDER */}
                <button
                  onClick={
                    handlePlaceOrder
                  }
                  disabled={
                    placing ||
                    !amountNum ||
                    !duration
                  }
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-sky-300 shadow-lg shadow-sky-500/20"
                >
                  {placing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      Place Order
                    </>
                  )}
                </button>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
