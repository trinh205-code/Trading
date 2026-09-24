export interface PnlChartPoint {
  timestamp: string;
  dateLabel: string;
  assetValue: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  cumulativePnl: number;
}

export interface PnlAnalyticsResponse {
  currentTotalAsset: number;
  periodPnl: number;
  periodPnlPercentage: number;
  period: '1D' | '7D' | '30D' | '180D' | '1Y' | string;
  chartPoints: PnlChartPoint[];
}
