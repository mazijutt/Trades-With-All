const SYMBOL_TO_COINGECKO = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  DOT: 'polkadot',
};

const COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT'];

const BINANCE_TICKER_URL = 'https://api.binance.com/api/v3/ticker/24hr';
const BYBIT_TICKER_URL = 'https://api.bybit.com/v5/market/tickers?category=spot';
const BINANCE_KLINES_URL = 'https://api.binance.com/api/v3/klines';

let cache = {
  prices: null,
  pricesUpdatedAt: 0,
  ohlc: new Map(),
};

const PRICES_CACHE_TTL = 10000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = async (url, timeout = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

export async function getCryptoPrices() {
  const now = Date.now();
  if (cache.prices && now - cache.pricesUpdatedAt < PRICES_CACHE_TTL) {
    return cache.prices;
  }

  let result = null;

  try {
    result = await fetchPricesFromBinance();
  } catch (err) {
    console.warn('Binance price fetch failed:', err.message);
  }

  if (!result) {
    try {
      result = await fetchPricesFromBybit();
    } catch (err) {
      console.warn('Bybit price fetch failed:', err.message);
    }
  }

  if (!result) {
    try {
      result = await fetchPricesFromCoinGecko();
    } catch (err) {
      console.warn('CoinGecko price fetch failed:', err.message);
    }
  }

  if (result) {
    cache.prices = result;
    cache.pricesUpdatedAt = now;
  }

  return result || cache.prices;
}

async function fetchPricesFromBinance() {
  const symbols = COINS.map(c => `${c}USDT`).join(',');
  const res = await fetchWithTimeout(`${BINANCE_TICKER_URL}?symbols=${encodeURIComponent(`["${COINS.map(c => `${c}USDT`).join('","')}"]`)}`);
  if (!res.ok) throw new Error(`Binance status ${res.status}`);
  const data = await res.json();

  const result = {};
  for (const item of data) {
    const symbol = item.symbol.replace('USDT', '');
    if (!COINS.includes(symbol)) continue;
    result[symbol] = {
      price: parseFloat(item.lastPrice),
      change_24h: parseFloat(item.priceChangePercent),
      volume_24h: parseFloat(item.quoteVolume) || parseFloat(item.volume) || 0,
      high_24h: parseFloat(item.highPrice),
      low_24h: parseFloat(item.lowPrice),
      last_updated: Math.floor(Date.now() / 1000),
    };
  }
  return result;
}

async function fetchPricesFromBybit() {
  const res = await fetchWithTimeout(BYBIT_TICKER_URL);
  if (!res.ok) throw new Error(`Bybit status ${res.status}`);
  const data = await res.json();
  if (!data.result?.list) throw new Error('Bybit empty result');

  const result = {};
  for (const item of data.result.list) {
    const symbol = item.symbol.replace('USDT', '');
    if (!COINS.includes(symbol)) continue;
    result[symbol] = {
      price: parseFloat(item.lastPrice),
      change_24h: parseFloat(item.price24hPcnt) * 100,
      volume_24h: parseFloat(item.turnover24h) || 0,
      high_24h: parseFloat(item.highPrice24h),
      low_24h: parseFloat(item.lowPrice24h),
      last_updated: Math.floor(Date.now() / 1000),
    };
  }
  if (Object.keys(result).length === 0) throw new Error('Bybit no symbols matched');
  return result;
}

async function fetchPricesFromCoinGecko() {
  const ids = COINS.map(c => SYMBOL_TO_COINGECKO[c]).join(',');
  const res = await fetchWithTimeout(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`
  );
  if (!res.ok) throw new Error(`CoinGecko status ${res.status}`);
  const data = await res.json();

  const result = {};
  for (const symbol of COINS) {
    const coinId = SYMBOL_TO_COINGECKO[symbol];
    const item = data[coinId];
    if (item) {
      result[symbol] = {
        price: item.usd || 0,
        change_24h: item.usd_24h_change ?? 0,
        volume_24h: item.usd_24h_vol || 0,
        high_24h: 0,
        low_24h: 0,
        last_updated: item.last_updated_at || Math.floor(Date.now() / 1000),
      };
    }
  }
  if (Object.keys(result).length === 0) throw new Error('CoinGecko empty result');
  return result;
}

export async function getCryptoPrice(symbol) {
  const prices = await getCryptoPrices();
  const normalized = (symbol || '').toUpperCase();
  return prices?.[normalized]?.price ?? 0;
}

export async function getOHLC(symbol, interval = '15m', limit = 100) {
  const normalized = (symbol || '').toUpperCase();
  const cacheKey = `${normalized}-${interval}-${limit}`;
  const cached = cache.ohlc.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.data;
  }

  let ohlc = null;

  try {
    ohlc = await fetchOHLCFromBinance(normalized, interval, limit);
  } catch (err) {
    console.warn(`Binance OHLC fetch failed for ${normalized}:`, err.message);
  }

  if (!ohlc) {
    try {
      ohlc = await fetchOHLCFromCoinGecko(normalized, limit);
    } catch (err) {
      console.warn(`CoinGecko OHLC fetch failed for ${normalized}:`, err.message);
    }
  }

  if (ohlc) {
    cache.ohlc.set(cacheKey, { data: ohlc, timestamp: Date.now() });
  }

  return ohlc || (cached?.data || []);
}

async function fetchOHLCFromBinance(symbol, interval, limit) {
  const res = await fetchWithTimeout(
    `${BINANCE_KLINES_URL}?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Binance klines status ${res.status}`);
  const data = await res.json();

  return data.map(k => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

async function fetchOHLCFromCoinGecko(symbol, limit) {
  const coinId = SYMBOL_TO_COINGECKO[symbol] || 'bitcoin';
  await sleep(500);
  const res = await fetchWithTimeout(
    `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=1`
  );
  if (!res.ok) throw new Error(`CoinGecko ohlc status ${res.status}`);
  const data = await res.json();

  return (data || []).map(c => ({
    time: Math.floor(c[0] / 1000),
    open: c[1],
    high: c[2],
    low: c[3],
    close: c[4],
  }));
}

export function getCoinId(symbol) {
  return SYMBOL_TO_COINGECKO[(symbol || '').toUpperCase()] || 'bitcoin';
}