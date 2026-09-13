/*
 * ==============================
 * CANDLESTICK CHART
 * ==============================
 */

const initializeChart = useCallback(() => {
  const container = chartContainerRef.current;

  if (!container) {
    console.warn('Chart container not available');
    return null;
  }

  // Already initialized
  if (chartRef.current && candleSeriesRef.current) {
    return chartRef.current;
  }

  try {
    const chart = createChart(container, {
      width: Math.max(container.clientWidth, 300),
      height: 320,

      layout: {
        background: {
          type: ColorType.Solid,
          color: 'transparent',
        },
        textColor: '#6b7280',
        fontSize: 11,
      },

      grid: {
        vertLines: {
          color: 'rgba(226, 232, 240, 0.5)',
        },
        horzLines: {
          color: 'rgba(226, 232, 240, 0.5)',
        },
      },

      crosshair: {
        mode: CrosshairMode.Normal,
      },

      rightPriceScale: {
        borderColor: 'rgba(226, 232, 240, 0.7)',
        autoScale: true,
      },

      timeScale: {
        borderColor: 'rgba(226, 232, 240, 0.7)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
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

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Responsive resize
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current =
        new ResizeObserver((entries) => {
          if (!entries.length) return;

          const width =
            entries[0].contentRect.width;

          if (
            chartRef.current &&
            width > 0
          ) {
            chartRef.current.applyOptions({
              width,
            });
          }
        });

      resizeObserverRef.current.observe(
        container
      );
    }

    return chart;
  } catch (error) {
    console.error(
      'Failed to initialize chart:',
      error
    );

    chartRef.current = null;
    candleSeriesRef.current = null;

    setChartError(true);

    return null;
  }
}, []);

useEffect(() => {
  // Wait until the DOM has painted and
  // the chart container has a real width.
  const timer = setTimeout(() => {
    initializeChart();
  }, 100);

  return () => {
    clearTimeout(timer);
  };
}, [initializeChart]);

const renderCandlestickChart = useCallback(
  (ohlcData) => {
    if (
      !Array.isArray(ohlcData) ||
      ohlcData.length === 0
    ) {
      console.warn(
        'No OHLC data received'
      );

      setChartError(true);
      return;
    }

    const chart =
      chartRef.current ||
      initializeChart();

    const series =
      candleSeriesRef.current;

    if (!chart || !series) {
      console.error(
        'Chart or candle series not initialized'
      );

      setChartError(true);
      return;
    }

    const candles = ohlcData
      .map((point) => {
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

        // Backend sends Unix seconds.
        // Also support milliseconds just in case.
        const time =
          timestamp > 100000000000
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

    // Remove duplicate timestamps
    const uniqueCandles = Array.from(
      new Map(
        candles.map((candle) => [
          candle.time,
          candle,
        ])
      ).values()
    ).sort(
      (a, b) => a.time - b.time
    );

    if (uniqueCandles.length === 0) {
      console.error(
        'No valid candles after conversion'
      );

      setChartError(true);
      return;
    }

    try {
      series.setData(uniqueCandles);

      chart.timeScale().fitContent();

      // Make sure the latest candle is visible
      chart.timeScale().scrollToRealTime();

      setChartError(false);

      console.log(
        `Chart rendered: ${uniqueCandles.length} candles`
      );
    } catch (error) {
      console.error(
        'Failed to render candlestick data:',
        error
      );

      setChartError(true);
    }
  },
  [initializeChart]
);

const fetchChartData = useCallback(
  async () => {
    try {
      setChartLoading(true);
      setChartError(false);

      const config =
        CRYPTO_CONFIG[selectedCrypto];

      if (!config?.coinId) {
        throw new Error(
          `No coin ID configured for ${selectedCrypto}`
        );
      }

      console.log(
        `Loading chart for ${selectedCrypto} using ${config.coinId}`
      );

      const { data } = await api.get(
        `/prices/ohlc/${config.coinId}?interval=15m&limit=96`
      );

      console.log(
        'OHLC response:',
        data
      );

      if (
        Array.isArray(data) &&
        data.length > 0
      ) {
        renderCandlestickChart(data);
      } else {
        console.warn(
          'OHLC response is empty'
        );

        setChartError(true);
      }
    } catch (error) {
      console.error(
        'Failed to fetch OHLC data:',
        error
      );

      setChartError(true);
    } finally {
      setChartLoading(false);
    }
  },
  [
    selectedCrypto,
    renderCandlestickChart,
  ]
);
