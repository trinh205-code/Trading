# BACKEND REQUIREMENTS & INTEGRATION SPECIFICATION

This document outlines the current state of the **Spring Boot (BinaceT)** backend and specifies missing endpoints or features needed for seamless integration with the **Slayer Crypto Exchange Frontend**.

---

## 1. Current Backend Overview

- **Framework**: Java 21 / Spring Boot 3.x, Spring Security, Spring Data JPA
- **Authentication**: JWT Bearer Token (Stateless)
- **Database**: PostgreSQL / MySQL with JPA Entities (`User`, `WalletBalance`, `Order`, `Market`, `Trade`, `RefreshToken`, `BlacklistedToken`)
- **Queue / Event Processing**: Kafka / In-Memory Queue (`OrderProducer`, `OrderConsumer`, `LiveMatchingEngine`)
- **WebSocket Engine**: STOMP over SockJS (`/ws`), plus background `BinanceWebSocketClient` pulling BTCUSDT ticker from Binance.

---

## 2. API Endpoints Mapping

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticates user and returns JWT access token & refresh token.
- `POST /api/auth/logout`: Invalidates refresh token / adds to blacklist.
- `POST /api/auth`: Creates a new user account (Note: `@PostMapping("/register")` is currently commented out in `AuthController.java`).

### User Management (`/api/users`)
- `GET /api/users/me`: Gets profile of currently authenticated user.
- `GET /api/users/{id}`: Gets user details by ID.
- `GET /api/users`: Gets all users (Admin).
- `PUT /api/users/{id}`: Updates user details.
- `DELETE /api/users/{id}`: Deletes user.
- `PUT /api/users/me/password`: Changes user password.

### Market Data (`/api/market`)
- `GET /api/market/prices`: Gets 24h ticker for active trading pairs (`BTCUSDT`, `ETHUSDT`, `BNBUSDT`, `SOLUSDT`, `XRPUSDT`).
- `GET /api/market/price/{symbol}`: Gets 24h ticker for a specific symbol.
- `GET /api/market/order-book/{symbol}`: Gets order book bids & asks (top 10 depth) from Binance.

### Order Management (`/api/orders`)
- `POST /api/orders`: Places a new `LIMIT` or `MARKET` order (`BUY` or `SELL`).
- `POST /api/orders/{id}/cancel`: Cancels an existing open order and unlocks wallet balance.
- `GET /api/orders/{id}`: Gets details of a specific order.
- `GET /api/orders?symbol={symbol}&page=0&size=10`: Gets paginated list of user's orders.

### Wallet (`/api/v1/wallets`)
- `POST /api/v1/wallets/faucet`: Claims test funds for testing.
- `GET /api/v1/wallets/me`: Retrieves current user's wallet balances (available & locked per asset).

---

## 3. Missing APIs & Backend Recommendations

### 1. Historical Kline / Candlestick API
- **Required by**: TradingView / Lightweight Charts for historical price chart rendering across multiple timeframes (`1m`, `5m`, `15m`, `1h`, `4h`, `1D`).
- **Current State**: Backend lacks a kline endpoint.
- **Frontend Workaround**: Frontend fetches historical Kline candles directly from Binance Public REST API (`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=500`).
- **Recommended Backend API**:
  ```http
  GET /api/market/{symbol}/klines?interval=1m&limit=500
  ```

### 2. WebSocket Realtime Topic Broadcasting (STOMP Push)
- **Required by**: Realtime ticker updates, live order book streaming, and instant order execution notifications without HTTP polling.
- **Current State**: Backend defines `WebSocketConfig` at `/ws` with brokers `/topic` and `/queue`, but `SimpMessagingTemplate` is not yet injected into `LiveMatchingEngine` or `BinanceWebSocketClient` to broadcast updates to clients.
- **Frontend Workaround**: Frontend integrates with STOMP `/ws` for backend communication, and subscribes directly to Binance WebSockets (`wss://stream.binance.com:9443/ws/...`) for ultra-low-latency price updates.
- **Recommended Backend STOMP Topics**:
  - `/topic/ticker/{symbol}` - Ticker price ticks
  - `/topic/orderbook/{symbol}` - Live depth updates
  - `/user/queue/orders` - Private order execution updates (`FILLED`, `CANCELED`)

### 3. Dedicated Refresh Token Endpoint
- **Required by**: Axios 401 interceptor for background token renewal when access token expires.
- **Current State**: `RefreshToken` entity and `JwtService` exist, but no explicit `POST /api/auth/refresh` controller method is present.
- **Recommended Backend API**:
  ```http
  POST /api/auth/refresh
  Body: { "refreshToken": "string" }
  Response: { "accessToken": "string", "refreshToken": "string" }
  ```

### 4. Trade History API
- **Required by**: Dedicated trade history tab / executed trades list on the trading terminal.
- **Current State**: Backend records `Trade` entity internally during matching, but does not expose `GET /api/orders/trades` or `GET /api/market/trades/{symbol}`.
- **Recommended Backend API**:
  ```http
  GET /api/orders/trades?symbol=BTCUSDT
  ```
