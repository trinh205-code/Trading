import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useMarketStore } from '../stores/marketStore';

class WebSocketManager {
  private stompClient: Client | null = null;
  private binanceWs: WebSocket | null = null;
  private isStompConnected: boolean = false;
  private currentSymbol: string = 'BTCUSDT';

  public connectStomp(onConnected?: () => void) {
    if (this.stompClient && this.stompClient.active) {
      return;
    }

    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('⚡ STOMP WebSocket connected successfully to Spring Boot!');
        this.isStompConnected = true;
        if (onConnected) onConnected();
      },
      onDisconnect: () => {
        console.log('STOMP WebSocket disconnected.');
        this.isStompConnected = false;
      },
      onStompError: (frame) => {
        console.warn('STOMP Error:', frame.headers['message']);
      },
    });

    this.stompClient.activate();
  }

  private allTickersWs: WebSocket | null = null;

  /**
   * Direct Binance WebSocket client fallback for instant price ticks
   */
  public connectBinanceTicker(symbol: string) {
    const cleanSymbol = symbol.toLowerCase();
    this.currentSymbol = symbol.toUpperCase();

    if (this.binanceWs) {
      this.binanceWs.close();
    }

    const binanceUrl = `wss://stream.binance.com:9443/ws/${cleanSymbol}@ticker`;
    this.binanceWs = new WebSocket(binanceUrl);

    this.binanceWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.c) {
          const price = parseFloat(data.c);
          useMarketStore.getState().updateMarketPriceRealtime(this.currentSymbol, price);
        }
      } catch (err) {
        // silent parse fail
      }
    };

    this.binanceWs.onerror = (err) => {
      console.warn('Binance WS error:', err);
    };
  }

  /**
   * Binance Mini-Ticker array stream to update all market prices in real-time
   */
  public connectAllTickers() {
    if (this.allTickersWs && this.allTickersWs.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.allTickersWs = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
      this.allTickersWs.onmessage = (event) => {
        try {
          const list = JSON.parse(event.data);
          if (Array.isArray(list)) {
            list.forEach((item: any) => {
              if (item && item.s && item.c && item.s.endsWith('USDT')) {
                useMarketStore.getState().updateMarketPriceRealtime(item.s, parseFloat(item.c));
              }
            });
          }
        } catch {
          // silent fail
        }
      };
      this.allTickersWs.onerror = () => {
        // silent fallback
      };
    } catch {
      // ignore
    }
  }

  public disconnectAll() {
    if (this.stompClient && this.stompClient.active) {
      this.stompClient.deactivate();
    }
    if (this.binanceWs) {
      this.binanceWs.close();
    }
    if (this.allTickersWs) {
      this.allTickersWs.close();
    }
  }
}

export const webSocketManager = new WebSocketManager();
