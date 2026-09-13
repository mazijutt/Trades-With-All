const SYMBOL_TO_COINGECKO = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  DOT: 'polkadot',
  BTS: 'bitshares',
};

const COINS = [
  'BTC',
  'ETH',
  'BNB',
  'SOL',
  'XRP',
  'DOGE',
  'ADA',
  'DOT',
  'BTS',
];

const BINANCE_TICKER_URL =
  'https://api.binance.com/api/v3/ticker/24hr';

const BINANCE_KLINES_URL =
  'https://api.binance.com/api/v3/klines';

const BYBIT_TICKER_URL =
  'https://api.bybit.com/v5/market/tickers?category=spot';

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price';

const cache = {
  prices: null,
  pricesUpdatedAt: 0,
  ohlc: new Map(),
};

/*
 * IMPORTANT:
 * Do not request external APIs every 10 seconds.
 * This cache protects against CoinGecko 429.
 */
const PRICE_CACHE_TTL = 30000;

const fetchWithTimeout = async (url, timeout = 10000) => {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Gemini-Exchange/1.0',
      },
    });
  } finally {
    clearTimeout(timer);
  }
};

/* =========================================================
   MAIN PRICE FUNCTION
   ========================================================= */

export async function getCryptoPrices() {
  const now = Date.now();

  /*
   * Return cached prices first.
   * This prevents Render from hitting APIs every 10 seconds.
   */
  if (
    cache.prices &&
    now - cache.pricesUpdatedAt < PRICE_CACHE_TTL
  ) {
    return cache.prices;
  }

  let result = {};

  /*
   * -------------------------------------------------------
   * 1. BINANCE
   * -------------------------------------------------------
   *
   * BTS is intentionally excluded because Binance does not
   * provide the BTSUSDT pair.
   */

  try {
    const binance = await fetchPricesFromBinance();

    if (binance) {
      result = {
        ...result,
        ...binance,
      };
    }
  } catch (error) {
    console.warn(
      'Binance price fetch failed:',
      error.message
    );
  }

  /*
   * -------------------------------------------------------
   * 2. BYBIT
   * -------------------------------------------------------
   *
   * Only request it if Binance failed or some coins are
   * missing.
   */

  const missingCoins = COINS.filter(
    (coin) => !result[coin]
  );

  if (missingCoins.length > 0) {
    try {
      const bybit = await fetchPricesFromBybit();

      if (bybit) {
        for (const coin of missingCoins) {
          if (bybit[coin]) {
            result[coin] = bybit[coin];
          }
        }
      }
    } catch (error) {
      console.warn(
        'Bybit price fetch failed:',
        error.message
      );
    }
  }

  /*
   * -------------------------------------------------------
   * 3. COINGECKO
   * -------------------------------------------------------
   *
   * Only request missing coins.
   *
   * This is especially important for BTS.
   */

  const stillMissing = COINS.filter(
    (coin) => !result[coin]
  );

  if (stillMissing.length > 0) {
    try {
      const coinGecko =
        await fetchPricesFromCoinGecko(stillMissing);

      if (coinGecko) {
        for (const coin of stillMissing) {
          if (coinGecko[coin]) {
            result[coin] = coinGecko[coin];
          }
        }
      }
    } catch (error) {
      console.warn(
        'CoinGecko price fetch failed:',
        error.message
      );
    }
  }

  /*
   * -------------------------------------------------------
   * 4. If external APIs fail temporarily, keep previous
   *    prices instead of returning an empty object.
   * -------------------------------------------------------
   */

  if (Object.keys(result).length > 0) {
    /*
     * Merge with old cache so a temporary API failure for
     * one coin does not remove its previous price.
     */
    if (cache.prices) {
      result = {
        ...cache.prices,
        ...result,
      };
    }

    cache.prices = result;
    cache.pricesUpdatedAt = now;

    return result;
  }

  return cache.prices || {};
}

/* =========================================================
   BINANCE
   ========================================================= */

async function fetchPricesFromBinance() {
  const binanceCoins = COINS.filter(
    (coin) => coin !== 'BTS'
  );

  const symbols = binanceCoins.map(
    (coin) => `${coin}USDT`
  );

  const encodedSymbols = encodeURIComponent(
    JSON.stringify(symbols)
  );

  const url =
    `${BINANCE_TICKER_URL}?symbols=${encodedSymbols}`;

  const res = await fetchWithTimeout(url);

  if (!res.ok) {
    throw new Error(
      `Binance status ${res.status}`
    );
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error(
      'Binance invalid response'
    );
  }

  const result = {};

  for (const item of data) {
    const symbol = item.symbol.replace(
      'USDT',
      ''
    );

    if (!COINS.includes(symbol)) {
      continue;
    }

    const price =
      Number(item.lastPrice);

    if (!Number.isFinite(price) || price <= 0) {
      continue;
    }

    result[symbol] = {
      price,

      change_24h:
        Number(item.priceChangePercent) || 0,

      volume_24h:
        Number(item.quoteVolume) ||
        Number(item.volume) ||
        0,

      high_24h:
        Number(item.highPrice) || 0,

      low_24h:
        Number(item.lowPrice) || 0,

      last_updated:
        Math.floor(Date.now() / 1000),
    };
  }

  return result;
}

/* =========================================================
   BYBIT
   ========================================================= */

async function fetchPricesFromBybit() {
  const res = await fetchWithTimeout(
    BYBIT_TICKER_URL
  );

  if (!res.ok) {
    throw new Error(
      `Bybit status ${res.status}`
    );
  }

  const data = await res.json();

  if (!data.result?.list) {
    throw new Error(
      'Bybit empty result'
    );
  }

  const result = {};

  for (const item of data.result.list) {
    const symbol =
      item.symbol.replace('USDT', '');

    if (!COINS.includes(symbol)) {
      continue;
    }

    const price =
      Number(item.lastPrice);

    if (!Number.isFinite(price) || price <= 0) {
      continue;
    }

    result[symbol] = {
      price,

      change_24h:
        Number(item.price24hPcnt) * 100 || 0,

      volume_24h:
        Number(item.turnover24h) || 0,

      high_24h:
        Number(item.highPrice24h) || 0,

      low_24h:
        Number(item.lowPrice24h) || 0,

      last_updated:
        Math.floor(Date.now() / 1000),
    };
  }

  return result;
}

/* =========================================================
   COINGECKO
   ========================================================= */

async function fetchPricesFromCoinGecko(
  requestedCoins = COINS
) {
  const validCoins = requestedCoins.filter(
    (coin) => SYMBOL_TO_COINGECKO[coin]
  );

  if (validCoins.length === 0) {
    return {};
  }

  const ids = validCoins.map(
    (coin) => SYMBOL_TO_COINGECKO[coin]
  );

  const url =
    `${COINGECKO_URL}` +
    `?ids=${encodeURIComponent(ids.join(','))}` +
    `&vs_currencies=usd` +
    `&include_24hr_vol=true` +
    `&include_24hr_change=true` +
    `&include_last_updated_at=true`;

  const res = await fetchWithTimeout(url);

  if (!res.ok) {
    throw new Error(
      `CoinGecko status ${res.status}`
    );
  }

  const data = await res.json();

  const result = {};

  for (const symbol of validCoins) {
    const coinId =
      SYMBOL_TO_COINGECKO[symbol];

    const item = data[coinId];

    if (!item) {
      continue;
    }

    const price = Number(item.usd);

    if (!Number.isFinite(price) || price <= 0) {
      continue;
    }

    result[symbol] = {
      price,

      change_24h:
        Number(item.usd_24h_change) || 0,

      volume_24h:
        Number(item.usd_24h_vol) || 0,

      high_24h: 0,

      low_24h: 0,

      last_updated:
        item.last_updated_at ||
        Math.floor(Date.now() / 1000),
    };
  }

  return result;
}

/* =========================================================
   SINGLE PRICE
   ========================================================= */

export async function getCryptoPrice(symbol) {
  const normalized =
    (symbol || '').toUpperCase();

  const prices =
    await getCryptoPrices();

  return prices?.[normalized]?.price || 0;
}

/* =========================================================
   OHLC / CHART
   ========================================================= */

export async function getOHLC(
  symbol,
  interval = '15m',
  limit = 100
) {
  const normalized =
    (symbol || '').toUpperCase();

  const cacheKey =
    `${normalized}-${interval}-${limit}`;

  const cached =
    cache.ohlc.get(cacheKey);

  /*
   * Chart cache for 60 seconds.
   */
  if (
    cached &&
    Date.now() - cached.timestamp < 60000
  ) {
    return cached.data;
  }

  let ohlc = null;

  /*
   * BTS does not use Binance.
   */
  if (normalized !== 'BTS') {
    try {
      ohlc =
        await fetchOHLCFromBinance(
          normalized,
          interval,
          limit
        );
    } catch (error) {
      console.warn(
        `Binance OHLC fetch failed for ${normalized}:`,
        error.message
      );
    }
  }

  /*
   * CoinGecko fallback.
   */
  if (!ohlc) {
    try {
      ohlc =
        await fetchOHLCFromCoinGecko(
          normalized,
          limit
        );
    } catch (error) {
      console.warn(
        `CoinGecko OHLC fetch failed for ${normalized}:`,
        error.message
      );
    }
  }

  if (ohlc && ohlc.length > 0) {
    cache.ohlc.set(cacheKey, {
      data: ohlc,
      timestamp: Date.now(),
    });

    return ohlc;
  }

  return cached?.data || [];
}

/* =========================================================
   BINANCE OHLC
   ========================================================= */

async function fetchOHLCFromBinance(
  symbol,
  interval,
  limit
) {
  const url =
    `${BINANCE_KLINES_URL}` +
    `?symbol=${symbol}USDT` +
    `&interval=${interval}` +
    `&limit=${limit}`;

  const res =
    await fetchWithTimeout(url);

  if (!res.ok) {
    throw new Error(
      `Binance klines status ${res.status}`
    );
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error(
      'Binance invalid klines response'
    );
  }

  return data.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

/* =========================================================
   COINGECKO OHLC
   ========================================================= */

async function fetchOHLCFromCoinGecko(
  symbol,
  limit
) {
  const coinId =
    SYMBOL_TO_COINGECKO[symbol];

  if (!coinId) {
    throw new Error(
      `Unknown coin: ${symbol}`
    );
  }

  const url =
    `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc` +
    `?vs_currency=usd&days=1`;

  const res =
    await fetchWithTimeout(url);

  if (!res.ok) {
    throw new Error(
      `CoinGecko ohlc status ${res.status}`
    );
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    return [];
  }

  let candles = data.map((c) => ({
    time: Math.floor(c[0] / 1000),
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
  }));

  if (
    limit &&
    candles.length > limit
  ) {
    candles =
      candles.slice(-limit);
  }

  return candles;
}

/* =========================================================
   COINGECKO ID
   ========================================================= */

export function getCoinId(symbol) {
  return (
    SYMBOL_TO_COINGECKO[
      (symbol || '').toUpperCase()
    ] || 'bitcoin'
  );
}
