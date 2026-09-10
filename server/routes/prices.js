import express from 'express';
import { protect } from '../middleware/auth.js';
import { getCryptoPrices, getOHLC, getCoinId } from '../utils/prices.js';

const router = express.Router();

const COIN_ID_MAP = {
  'bitcoin': 'BTC', 'ethereum': 'ETH', 'binancecoin': 'BNB',
  'solana': 'SOL', 'ripple': 'XRP', 'dogecoin': 'DOGE',
  'cardano': 'ADA', 'polkadot': 'DOT',
};

function resolveSymbol(input) {
  const upper = (input || '').toUpperCase();
  if (['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT'].includes(upper)) return upper;
  return COIN_ID_MAP[(input || '').toLowerCase()] || 'BTC';
}

router.get('/public', async (req, res) => {
  try {
    const prices = await getCryptoPrices();
    res.json(prices || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/prices', protect, async (req, res) => {
  try {
    const prices = await getCryptoPrices();
    res.json(prices || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/market-chart/:coinId', protect, async (req, res) => {
  try {
    const symbol = resolveSymbol(req.params.coinId);
    const ohlc = await getOHLC(symbol, '15m', 96);
    res.json({ prices: ohlc.map(c => [c.time * 1000, c.close]) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/ohlc/:coinId', protect, async (req, res) => {
  try {
    const symbol = resolveSymbol(req.params.coinId);
    const interval = req.query.interval || '15m';
    const limit = parseInt(req.query.limit) || 100;
    const ohlc = await getOHLC(symbol, interval, limit);
    res.json(ohlc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;