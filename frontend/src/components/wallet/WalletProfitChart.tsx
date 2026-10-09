import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Eye, EyeOff, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { analyticsApi } from '../../api/analyticsApi';
import { PnlAnalyticsResponse, PnlChartPoint } from '../../types/analytics';

interface WalletProfitChartProps {
  showBalance: boolean;
  onToggleShowBalance: () => void;
  onClaimFaucet: () => void;
  onOpenTransfer: () => void;
  isClaimingFaucet?: boolean;
  faucetSuccess?: boolean;
  currentGrandTotal?: number;
}

type PeriodType = '1D' | '7D' | '30D' | '180D' | '1Y';

export const WalletProfitChart: React.FC<WalletProfitChartProps> = ({
  showBalance,
  onToggleShowBalance,
  onClaimFaucet,
  onOpenTransfer,
  isClaimingFaucet = false,
  faucetSuccess = false,
  currentGrandTotal = 0,
}) => {
  const [period, setPeriod] = useState<PeriodType>('30D');
  const [data, setData] = useState<PnlAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<PnlChartPoint | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isChartCollapsed, setIsChartCollapsed] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchAnalytics = async (selectedPeriod: PeriodType) => {
    setIsLoading(true);
    try {
      const res: any = await analyticsApi.getPnlAnalytics(selectedPeriod);
      if (res && res.data) {
        setData(res.data);
      }
    } catch {
      // Fallback local calculation if backend is loading
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  const periodLabels: Record<PeriodType, string> = {
    '1D': '1 Ngày',
    '7D': '1 Tuần',
    '30D': '1 Tháng',
    '180D': '6 Tháng',
    '1Y': '1 Năm',
  };

  const periodDayTexts: Record<PeriodType, string> = {
    '1D': '24 giờ',
    '7D': '7 ngày',
    '30D': '30 ngày',
    '180D': '6 tháng',
    '1Y': '1 năm',
  };

  // Generate rolling 24 hourly slots (from 23 hours ago to current hour)
  const getRolling24Hours = (currentEquity: number): PnlChartPoint[] => {
    const points: PnlChartPoint[] = [];
    const now = new Date();
    const currentHour = now.getHours();

    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(currentHour - i, 0, 0, 0);
      const h = d.getHours().toString().padStart(2, '0');
      const isCurrent = i === 0;

      points.push({
        timestamp: d.toISOString(),
        dateLabel: isCurrent ? `${h}:00 (Hiện tại)` : `${h}:00`,
        assetValue: Number(currentEquity.toFixed(2)),
        dailyPnl: 0,
        dailyPnlPercent: 0,
        cumulativePnl: 0,
      });
    }
    return points;
  };

  // Generate rolling daily slots (from days - 1 ago to today)
  const getRollingDays = (days: number, currentEquity: number): PnlChartPoint[] => {
    const points: PnlChartPoint[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dateStr = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const isToday = i === 0;

      points.push({
        timestamp: d.toISOString(),
        dateLabel: isToday ? `${dateStr} (Hôm nay)` : dateStr,
        assetValue: Number(currentEquity.toFixed(2)),
        dailyPnl: 0,
        dailyPnlPercent: 0,
        cumulativePnl: 0,
      });
    }
    return points;
  };

  // Auto-shift snapshot window when clock ticks to the next hour or day
  useEffect(() => {
    let lastHour = new Date().getHours();
    let lastDate = new Date().getDate();

    const timer = setInterval(() => {
      const currentNow = new Date();
      const currentH = currentNow.getHours();
      const currentD = currentNow.getDate();

      if (period === '1D' && currentH !== lastHour) {
        lastHour = currentH;
        fetchAnalytics('1D');
      } else if (period !== '1D' && currentD !== lastDate) {
        lastDate = currentD;
        fetchAnalytics(period);
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [period]);

  // Chart points with real-time active candle tracking
  const chartPoints: PnlChartPoint[] = useMemo(() => {
    let pts: PnlChartPoint[] = [];
    if (data?.chartPoints && data.chartPoints.length > 1) {
      pts = data.chartPoints.map((p) => ({ ...p }));
    } else if (period === '1D') {
      pts = getRolling24Hours(currentGrandTotal);
    } else {
      const days = period === '7D' ? 7 : period === '180D' ? 180 : period === '1Y' ? 365 : 30;
      pts = getRollingDays(days, currentGrandTotal);
    }

    if (pts.length > 0) {
      // Điểm cuối cùng là LIVE: liên tục di chuyển lên xuống theo currentGrandTotal
      const lastIdx = pts.length - 1;
      const startVal = pts[0].assetValue || currentGrandTotal;
      const livePnl = currentGrandTotal - startVal;
      const livePnlPct = startVal > 0 ? (livePnl / startVal) * 100 : 0;

      pts[lastIdx] = {
        ...pts[lastIdx],
        assetValue: Number(currentGrandTotal.toFixed(2)),
        dailyPnl: Number(livePnl.toFixed(2)),
        dailyPnlPercent: Number(livePnlPct.toFixed(2)),
        cumulativePnl: Number(livePnl.toFixed(2)),
      };
    }
    return pts;
  }, [data, period, currentGrandTotal]);

  // Overall metrics calculation
  const totalAsset = data?.currentTotalAsset ?? currentGrandTotal;
  const periodPnl = data?.periodPnl ?? (chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].assetValue - chartPoints[0].assetValue : 0);
  const periodPnlPercent = data?.periodPnlPercentage ?? (chartPoints.length > 0 && chartPoints[0].assetValue > 0 ? (periodPnl / chartPoints[0].assetValue) * 100 : 0);

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 220;
  const padding = { top: 35, bottom: 25, left: 10, right: 10 };

  // Calculate coordinates for SVG path
  const { pathD, areaD, pointsCoords, minPoint, maxPoint } = useMemo(() => {
    if (chartPoints.length === 0) {
      return { pathD: '', areaD: '', pointsCoords: [], minPoint: null, maxPoint: null };
    }

    const values = chartPoints.map((p) => p.assetValue);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const range = rawMax - rawMin || 1;
    const minVal = rawMin - range * 0.08;
    const maxVal = rawMax + range * 0.08;
    const effectiveRange = maxVal - minVal || 1;

    const innerW = svgWidth - padding.left - padding.right;
    const innerH = svgHeight - padding.top - padding.bottom;

    const coords = chartPoints.map((pt, idx) => {
      const x = padding.left + (idx / (chartPoints.length - 1 || 1)) * innerW;
      const y = padding.top + (1 - (pt.assetValue - minVal) / effectiveRange) * innerH;
      return { x, y, pt, idx };
    });

    // Find min and max points for floating tags
    let minIdx = 0;
    let maxIdx = 0;
    values.forEach((v, i) => {
      if (v < values[minIdx]) minIdx = i;
      if (v > values[maxIdx]) maxIdx = i;
    });

    // Build smooth cubic bezier curve
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 3;
      const cpY1 = curr.y;
      const cpX2 = next.x - (next.x - curr.x) / 3;
      const cpY2 = next.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    const lastCoord = coords[coords.length - 1];
    const firstCoord = coords[0];
    const floorY = svgHeight - padding.bottom;
    const area = `${d} L ${lastCoord.x} ${floorY} L ${firstCoord.x} ${floorY} Z`;

    return {
      pathD: d,
      areaD: area,
      pointsCoords: coords,
      minPoint: coords[minIdx],
      maxPoint: coords[maxIdx],
    };
  }, [chartPoints]);

  // Handle cursor move across the SVG chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || pointsCoords.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgRelativeX = (mouseX / rect.width) * svgWidth;

    // Find nearest point
    let closestIdx = 0;
    let minDistance = Infinity;
    pointsCoords.forEach((c, idx) => {
      const dist = Math.abs(c.x - svgRelativeX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoveredIndex(closestIdx);
    setHoveredPoint(chartPoints[closestIdx]);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoveredIndex(null);
  };

  // Selected or active point for metrics display
  const activeDisplayPnl = hoveredPoint ? hoveredPoint.dailyPnl : periodPnl;
  const activeDisplayPct = hoveredPoint ? hoveredPoint.dailyPnlPercent : periodPnlPercent;
  const isPnlPositive = activeDisplayPnl >= 0;

  return (
    <div
      ref={containerRef}
      className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-6 mb-8 transition-all"
    >
      {/* 1. Header Section: Tổng giá trị ước tính + PnL subline */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-4">
        <div>
          <div className="flex items-center space-x-2 text-[#777777] text-xs mb-1.5">
            <span>Tổng giá trị ước tính</span>
            <button
              onClick={onToggleShowBalance}
              className="text-[#777777] hover:text-white transition-colors"
              title={showBalance ? 'Ẩn số dư' : 'Hiện số dư'}
            >
              {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-baseline space-x-2 mb-1.5">
            <div className="text-3xl lg:text-4xl font-black font-mono tracking-tight text-white">
              {showBalance
                ? totalAsset.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '••••••'}
            </div>
            <span className="text-xs text-[#888888] font-bold flex items-center space-x-1">
              <span>USD</span>
              <ChevronDown className="w-3 h-3 text-[#666666]" />
            </span>
          </div>

          {/* Dynamic PnL subtitle matching screenshot */}
          <div className="text-xs font-mono flex items-center space-x-1.5">
            <span className="text-[#888888]">
              {hoveredPoint
                ? `PnL ngày ${hoveredPoint.dateLabel}:`
                : `PnL trong ${periodDayTexts[period]}:`}
            </span>
            <span
              className={`font-bold flex items-center ${
                isPnlPositive ? 'text-[#00c076]' : 'text-[#ff5b5b]'
              }`}
            >
              {isPnlPositive ? '+' : ''}${Math.abs(activeDisplayPnl).toFixed(2)} ({isPnlPositive ? '+' : ''}{activeDisplayPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* 2. Top Right: Action Buttons (Nạp tiền, Rút tiền, Chuyển tiền, Earn) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={onClaimFaucet}
            disabled={isClaimingFaucet}
            className="px-5 py-2 rounded-full bg-[#00c076] text-black font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 text-xs"
          >
            {isClaimingFaucet ? 'Đang cấp...' : faucetSuccess ? '✓ Đã nhận +10K' : 'Nạp tiền'}
          </button>

          <button
            onClick={onOpenTransfer}
            className="px-4 py-2 rounded-full bg-[#1e1e1e] hover:bg-[#282828] text-white font-medium transition-all text-xs border border-[#2b2b2b]"
          >
            Rút tiền
          </button>

          <button
            onClick={onOpenTransfer}
            className="px-4 py-2 rounded-full bg-[#1e1e1e] hover:bg-[#282828] text-white font-medium transition-all text-xs border border-[#2b2b2b]"
          >
            Chuyển tiền
          </button>

          <button
            onClick={() => alert('Chức năng Earn sẽ ra mắt trong phiên bản sắp tới!')}
            className="px-4 py-2 rounded-full bg-[#1e1e1e] hover:bg-[#282828] text-[#cccccc] hover:text-white font-medium transition-all text-xs border border-[#2b2b2b]"
          >
            Earn
          </button>
        </div>
      </div>

      {/* 3. Timeframe Tab Selector (1 Ngày | 1 Tuần | 1 Tháng | 6 Tháng | 1 Năm) */}
      <div className="flex items-center justify-end space-x-1 mb-2 pt-2 border-t border-[#1e1e1e]/60">
        {(['1D', '7D', '30D', '180D', '1Y'] as PeriodType[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              period === p
                ? 'bg-[#222222] text-white shadow-sm font-bold'
                : 'text-[#777777] hover:text-[#cccccc]'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* 4. Interactive Area Chart Component */}
      {!isChartCollapsed && (
        <div className="relative w-full overflow-hidden select-none pt-2">
          {isLoading && (
            <div className="absolute inset-0 bg-[#121212]/60 backdrop-blur-[1px] flex items-center justify-center z-20">
              <RefreshCw className="w-5 h-5 text-[#00c076] animate-spin" />
            </div>
          )}

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-44 sm:h-52 overflow-visible cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Gradient fill matching OKX/Binance green aesthetic */}
              <linearGradient id="pnlGreenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00c076" stopOpacity="0.25" />
                <stop offset="60%" stopColor="#00c076" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#00c076" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Area Fill */}
            {areaD && (
              <path
                d={areaD}
                fill="url(#pnlGreenGradient)"
                className="transition-all duration-300"
              />
            )}

            {/* Main Stroke Curve */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#00c076"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            )}

            {/* Highest Peak Marker Badge (e.g. $34,33) */}
            {maxPoint && !hoveredPoint && (
              <g className="transition-all duration-200">
                <line
                  x1={maxPoint.x}
                  y1={maxPoint.y}
                  x2={maxPoint.x}
                  y2={Math.max(12, maxPoint.y - 18)}
                  stroke="#444444"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle cx={maxPoint.x} cy={maxPoint.y} r="3" fill="#00c076" />
                <text
                  x={maxPoint.x}
                  y={Math.max(10, maxPoint.y - 22)}
                  textAnchor="middle"
                  fill="#888888"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ${maxPoint.pt.assetValue.toFixed(2)}
                </text>
              </g>
            )}

            {/* Lowest Trough Marker Badge (e.g. $9,51) */}
            {minPoint && !hoveredPoint && minPoint !== maxPoint && (
              <g className="transition-all duration-200">
                <line
                  x1={minPoint.x}
                  y1={minPoint.y}
                  x2={minPoint.x}
                  y2={minPoint.y + 16}
                  stroke="#444444"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle cx={minPoint.x} cy={minPoint.y} r="3" fill="#888888" />
                <text
                  x={minPoint.x}
                  y={minPoint.y + 28}
                  textAnchor="middle"
                  fill="#777777"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ${minPoint.pt.assetValue.toFixed(2)}
                </text>
              </g>
            )}

            {/* Hover Crosshair & Tracking Dot */}
            {hoveredIndex !== null && pointsCoords[hoveredIndex] && (
              <g className="transition-all duration-75">
                <line
                  x1={pointsCoords[hoveredIndex].x}
                  y1={padding.top - 10}
                  x2={pointsCoords[hoveredIndex].x}
                  y2={svgHeight - padding.bottom}
                  stroke="#555555"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={pointsCoords[hoveredIndex].x}
                  cy={pointsCoords[hoveredIndex].y}
                  r="5"
                  fill="#ffffff"
                  stroke="#00c076"
                  strokeWidth="2.5"
                />
              </g>
            )}
            {/* Live Realtime Indicator on the Last Point (di chuyển liên tục theo số dư ví) */}
            {pointsCoords.length > 0 && !hoveredPoint && (
              <g className="transition-all duration-300">
                <circle
                  cx={pointsCoords[pointsCoords.length - 1].x}
                  cy={pointsCoords[pointsCoords.length - 1].y}
                  r="8"
                  fill="#00c076"
                  className="animate-ping opacity-60"
                />
                <circle
                  cx={pointsCoords[pointsCoords.length - 1].x}
                  cy={pointsCoords[pointsCoords.length - 1].y}
                  r="4.5"
                  fill="#00c076"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {/* Floating Hover Tooltip Popover */}
          {hoveredPoint && hoveredIndex !== null && pointsCoords[hoveredIndex] && (
            <div
              className="absolute pointer-events-none z-30 transition-all duration-75 transform -translate-x-1/2 -translate-y-full mb-3"
              style={{
                left: `${(pointsCoords[hoveredIndex].x / svgWidth) * 100}%`,
                top: `${(pointsCoords[hoveredIndex].y / svgHeight) * 100}%`,
              }}
            >
              <div className="bg-[#1a1a1a] border border-[#333333] rounded-xl px-3 py-2 text-[10px] font-mono shadow-2xl space-y-0.5 whitespace-nowrap">
                <div className="text-[#888888] font-bold text-[9px]">
                  {hoveredPoint.dateLabel}
                </div>
                <div className="text-white font-bold text-xs">
                  ${hoveredPoint.assetValue.toFixed(2)} USD
                </div>
                <div
                  className={`font-semibold ${
                    hoveredPoint.dailyPnl >= 0 ? 'text-[#00c076]' : 'text-[#ff5b5b]'
                  }`}
                >
                  PnL: {hoveredPoint.dailyPnl >= 0 ? '+' : ''}${hoveredPoint.dailyPnl.toFixed(2)} ({hoveredPoint.dailyPnlPercent >= 0 ? '+' : ''}{hoveredPoint.dailyPnlPercent.toFixed(2)}%)
                </div>
                <div className="text-[#777777] text-[9px]">
                  Lũy kế: {hoveredPoint.cumulativePnl >= 0 ? '+' : ''}${hoveredPoint.cumulativePnl.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Timeline X-Axis Labels */}
          <div className="flex justify-between items-center px-4 pt-1 text-[11px] text-[#666666] font-mono">
            {chartPoints
              .filter((_, i) => {
                if (chartPoints.length <= 6) return true;
                const step = Math.floor(chartPoints.length / 5);
                return i % step === 0 || i === chartPoints.length - 1;
              })
              .slice(0, 6)
              .map((p, idx) => (
                <span key={idx}>
                  {p.dateLabel.replace(' (Hiện tại)', '').replace(' (Hôm nay)', '')}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* 5. Bottom Toggle Chevron matching Screenshot */}
      <div className="flex justify-center pt-3 border-t border-[#1e1e1e]/40 mt-3">
        <button
          onClick={() => setIsChartCollapsed(!isChartCollapsed)}
          className="text-[#666666] hover:text-white transition-colors p-1"
          title={isChartCollapsed ? 'Mở rộng biểu đồ' : 'Thu gọn biểu đồ'}
        >
          {isChartCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default WalletProfitChart;
