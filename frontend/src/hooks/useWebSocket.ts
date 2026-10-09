import { useEffect } from 'react';
import { webSocketManager } from '../utils/webSocketManager';

export const useWebSocket = (symbol: string) => {
  useEffect(() => {
    webSocketManager.connectStomp();
    webSocketManager.connectBinanceTicker(symbol);
    webSocketManager.connectAllTickers();

    return () => {
      // Keep connection active or switch symbol seamlessly
    };
  }, [symbol]);
};
