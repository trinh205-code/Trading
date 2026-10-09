import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  CandlestickData,
  Time,
} from 'lightweight-charts';
import { marketApi } from '../../api/marketApi';
import { RefreshCw, BarChart2, Eye, Settings, Maximize2 } from 'lucide-react';

interface TradingViewChartProps {
  symbol: string;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [activeHeaderTab, setActiveHeaderTab] = useState<'chart' | 'info' | 'data' | 'activity'>('chart');
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const timeframes = ['1s', '1m', '5m', '15m', '1h', '4h', '1d'];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize OKX-styled Lightweight Chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 420,
      layout: {
        background: { color: '#000000' },
        textColor: '#777777',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#141414' },
        horzLines: { color: '#141414' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#1e1e1e',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: '#1e1e1e',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // OKX Candlestick Series: Green #00c076, Red #ff5b5b
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00c076',
      downColor: '#ff5b5b',
      borderVisible: false,
      wickUpColor: '#00c076',
      wickDownColor: '#ff5b5b',
    });
    candleSeriesRef.current = candleSeries as any;

    // Volume Histogram Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries as any;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch Klines & Connect Realtime WebSocket on Symbol or Timeframe change
  useEffect(() => {
    let isMounted = true;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const fetchKlineData = async () => {
      setIsLoading(true);
      try {
        const binanceInterval = timeframe === '1s' ? '1s' : timeframe.toLowerCase();
        const klines = await marketApi.getHistoricalKlines(symbol, binanceInterval === '1s' ? '1m' : binanceInterval, 500);
        if (!isMounted) return;

        if (klines && klines.length > 0 && candleSeriesRef.current && volumeSeriesRef.current) {
          const candleData: CandlestickData<Time>[] = klines.map((k) => ({
            time: k.time as Time,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
          }));

          const volumeData = klines.map((k) => ({
            time: k.time as Time,
            value: k.volume || 0,
            color: k.close >= k.open ? 'rgba(0, 192, 118, 0.4)' : 'rgba(255, 91, 91, 0.4)',
          }));

          candleSeriesRef.current.setData(candleData);
          volumeSeriesRef.current.setData(volumeData);
          chartRef.current?.timeScale().fitContent();

          // Connect Realtime Binance Kline Stream
          const cleanSymbol = symbol.toLowerCase();
          const streamInterval = binanceInterval === '1s' ? '1m' : binanceInterval;
          const wsUrl = `wss://stream.binance.com:9443/ws/${cleanSymbol}@kline_${streamInterval}`;
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onmessage = (event) => {
            if (!isMounted || !candleSeriesRef.current || !volumeSeriesRef.current) return;
            try {
              const data = JSON.parse(event.data);
              if (data && data.k) {
                const candle = data.k;
                const timeSec = Math.floor(candle.t / 1000) as Time;
                const open = parseFloat(candle.o);
                const high = parseFloat(candle.h);
                const low = parseFloat(candle.l);
                const close = parseFloat(candle.c);
                const volume = parseFloat(candle.v);

                candleSeriesRef.current.update({
                  time: timeSec,
                  open,
                  high,
                  low,
                  close,
                });

                volumeSeriesRef.current.update({
                  time: timeSec,
                  value: volume,
                  color: close >= open ? 'rgba(0, 192, 118, 0.4)' : 'rgba(255, 91, 91, 0.4)',
                });
              }
            } catch {
              // ignore
            }
          };
        }
      } catch (err) {
        console.error('Error loading chart klines:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchKlineData();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [symbol, timeframe]);

  return (
    <div className="flex flex-col h-full bg-[#000000] select-none">
      {/* 1. Top Tabs matching OKX Screenshot 1 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1e1e1e] text-[11px] text-[#777777]">
        <div className="flex items-center space-x-6 font-semibold">
          <button
            onClick={() => setActiveHeaderTab('chart')}
            className={`transition-colors ${activeHeaderTab === 'chart' ? 'text-white font-bold' : 'hover:text-white'}`}
          >
            Biểu đồ
          </button>
          <button
            onClick={() => setActiveHeaderTab('info')}
            className={`transition-colors ${activeHeaderTab === 'info' ? 'text-white font-bold' : 'hover:text-white'}`}
          >
            Thông tin
          </button>
          <button
            onClick={() => setActiveHeaderTab('data')}
            className={`transition-colors ${activeHeaderTab === 'data' ? 'text-white font-bold' : 'hover:text-white'}`}
          >
            Dữ liệu giao dịch
          </button>
          <button
            onClick={() => setActiveHeaderTab('activity')}
            className={`transition-colors ${activeHeaderTab === 'activity' ? 'text-white font-bold' : 'hover:text-white'}`}
          >
            Hoạt động
          </button>
        </div>

        <div className="flex items-center space-x-3 text-[#666666]">
          <span className="text-[10px] text-[#888888]">Giá gần nhất</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#161616] text-white">Gốc</span>
          <span className="text-[10px] hover:text-white cursor-pointer">TradingView</span>
        </div>
      </div>

      {/* 2. Sub-Toolbar: Timeframes & Indicator labels matching Screenshot 1 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1a1a1a] text-[10px] text-[#777777]">
        <div className="flex items-center space-x-1 font-mono">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded transition-colors ${
                timeframe === tf
                  ? 'bg-[#222222] text-white font-bold'
                  : 'hover:text-white hover:bg-[#161616]'
              }`}
            >
              {tf}
            </button>
          ))}

          <span className="text-[#333333] px-1">|</span>

          <button className="flex items-center space-x-1 px-1.5 py-0.5 hover:text-white">
            <BarChart2 className="w-3 h-3 text-[#f5b300]" />
            <span>Chỉ báo</span>
          </button>
          <button className="flex items-center space-x-1 px-1.5 py-0.5 hover:text-white">
            <Eye className="w-3 h-3 text-[#2e90fa]" />
            <span>Hiển thị</span>
          </button>
          <button className="flex items-center space-x-1 px-1.5 py-0.5 hover:text-white">
            <Settings className="w-3 h-3 text-[#9c5bff]" />
            <span>Nâng cao</span>
          </button>
        </div>

        {isLoading && (
          <span className="flex items-center space-x-1 text-[#00c076] animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="text-[9px]">Đang tải...</span>
          </span>
        )}
      </div>

      {/* 3. Indicators Legend Overlay (MA5, MA10, MA20) */}
      <div className="px-3 py-1 text-[9px] font-mono flex items-center space-x-4 border-b border-[#141414] bg-[#000000]">
        <span className="text-[#f5b300]">MA(5) 81.738,8</span>
        <span className="text-[#9c5bff]">MA(10) 81.648,2</span>
        <span className="text-[#2e90fa]">MA(20) 81.471,3</span>
      </div>

      {/* 4. Chart Render Canvas */}
      <div ref={chartContainerRef} className="flex-1 w-full min-h-[380px] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[#000000]/60 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="w-6 h-6 border-2 border-[#00c076] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};
