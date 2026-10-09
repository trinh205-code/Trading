#  ARCHITECTURE.md - TÀI LIỆU KIẾN TRÚC HỆ THỐNG
> **Dự án**: TVN Exchange  
> **Phiên bản**: v2.5.0  

---

##  MỤC LỤC
1. [Sơ Đồ Kiến Trúc Tổng Thể](#1-sơ-đồ-kiến-trúc-tổng-thể)
2. [Kiến Trúc Phân Tầng Backend](#2-kiến-trúc-phân-tầng-backend)
3. [Luồng Xử Lý Khớp Lệnh Bất Đồng Bộ (Kafka Event-Driven)](#3-luồng-xử-lý-khớp-lệnh-bất-đồng-bộ-kafka)
4. [Kiến Trúc Giao Dịch Futures & Quản Trị Rủi Ro](#4-kiến-trúc-giao-dịch-futures--quản-trị-rủi-ro)
5. [Kiến Trúc Bảo Mật & Xác Thực Đa Lớp](#5-kiến-trúc-bảo-mật--xác-thực-đa-lớp)
6. [Sơ Đồ Quan Hệ Cơ Sở Dữ Liệu (Database ERD)](#6-sơ-đồ-quan-hệ-cơ-sở-dữ-liệu-erd)

---

## 1. SƠ ĐỒ KIẾN TRÚC TỔNG THỂ

```mermaid
graph TD
    Client["Client Web Browser (React 19 + TypeScript)"]

    subgraph "Tầng Giao Tiếp"
        Gateway["REST Controllers (Spring Boot 3)"]
        WS["WebSocket Broker (STOMP / SockJS)"]
    end

    subgraph "Tầng Xử Lý & Dịch Vụ"
        Auth["Auth & Security (JWT, BCrypt)"]
        Wallet["Wallet & P2P Service (Pessimistic Lock)"]
        Futures["Futures & Liquidation Service"]
        Spot["Spot Order Service"]
    end

    subgraph "Hàng Đợi & Khớp Lệnh"
        Kafka["Apache Kafka (Topics: spot-orders, market-trades)"]
        Engine["Live Matching Engine (Price-Time Priority)"]
    end

    subgraph "Tầng Lưu Trữ & Cache"
        Redis[("Redis 7 (Cache Ticker 24h & Session)")]
        MySQL[("MySQL 8.0 (20 Tables)")]
    end

    Client -->|HTTPS REST API| Gateway
    Client <-->|WSS Realtime Updates| WS
    Gateway --> Auth
    Gateway --> Wallet
    Gateway --> Futures
    Gateway --> Spot

    Spot -->|Publish Order Event| Kafka
    Kafka -->|Consume Order| Engine
    Engine -->|Update Order & Trades| MySQL
    Engine -->|Broadcast Trades| WS

    Wallet -->|Read/Write with Lock| MySQL
    Futures -->|Calculate Position & Margin| MySQL
    Gateway -->|Read Hot Prices| Redis
```

---

## 2. KIẾN TRÚC PHÂN TẦNG BACKEND

```
[ HTTP Requests ]
       │
       ▼
[ Controller Layer ]      -> Nhận request, Validate (@Valid), chuyển đổi DTO
       │
       ▼
[ Service Layer ]         -> Business Logic, Quản lý giao dịch (@Transactional), Kiểm tra OTP
       │
       ▼
[ Repository Layer ]      -> Spring Data JPA, Khóa bi quan (@Lock PESSIMISTIC_WRITE)
       │
       ▼
[ Database Layer (MySQL)] -> Lưu trữ dữ liệu quan hệ ACID
```

---

## 3. LUỒNG XỬ LÝ KHỚP LỆNH BẤT ĐỒNG BỘ (KAFKA)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant API as OrderController
    participant Service as OrderService
    participant Wallet as WalletBalance
    participant Kafka as Kafka Broker
    participant Engine as LiveMatchingEngine
    participant DB as MySQL Database

    User->>API: POST /api/orders (Đặt lệnh Mua/Bán)
    API->>Service: createOrder(request)
    Service->>Wallet: Khóa số dư khả dụng (Locked Balance)
    Service->>DB: Lưu lệnh mới (Status = OPEN)
    Service->>Kafka: Produce Event to 'spot-orders'
    Service-->>User: Phản hồi 200 OK (Đặt lệnh thành công)

    Kafka->>Engine: Consume Event
    Engine->>Engine: Khớp với sổ lệnh (Price-Time Priority)
    alt Khớp lệnh thành công
        Engine->>DB: Tạo bản ghi Trade
        Engine->>DB: Cập nhật Order (FILLED / PARTIALLY_FILLED)
        Engine->>Wallet: Trừ locked_balance, cộng coin mua vào
    end
```

---

## 4. KIẾN TRÚC GIAO DỊCH FUTURES & QUẢN TRỊ RỦI RO

1. **Chế độ ký quỹ Isolated**: Mỗi vị thế mở có một hạn mức ký quỹ riêng biệt (`lockedMargin`), không làm ảnh hưởng đến số dư còn lại của ví.
2. **Công thức tính rủi ro**:
   - `Initial Margin` = `(Position Size * Entry Price) / Leverage`
   - `Maintenance Margin` = `Position Size * Mark Price * MMR`
   - `Liquidation Price`:
     - Long: `Entry Price - (Initial Margin - Maintenance Margin) / Position Size`
     - Short: `Entry Price + (Initial Margin - Maintenance Margin) / Position Size`
3. **Cơ chế Reduce-Only**: Chặn người dùng đặt thêm lệnh đối ứng nếu đã có sẵn lệnh đóng 100% vị thế, ngăn ngừa việc vị thế bị đảo chiều ngoài ý muốn.

---

## 5. KIẾN TRÚC BẢO MẬT & XÁC THỰC ĐA LỚP

```mermaid
flowchart TD
    Req["Incoming Request"] --> AuthFilter["JwtAuthenticationFilter"]
    AuthFilter --> BlacklistCheck{"Kiểm tra Blacklist?"}
    BlacklistCheck -->|Token có trong Blacklist| Reject["401 Unauthorized"]
    BlacklistCheck -->|Hợp lệ| ExtractUser["Nạp UserDetails vào SecurityContext"]
    ExtractUser --> Controller["Controller Endpoint"]
    Controller --> SensitiveAction{"Thao tác nhạy cảm (Chuyển P2P)?"}
    SensitiveAction -->|Không| Execute["Thực hiện bình thường"]
    SensitiveAction -->|Có| VerifyOTP{"Kiểm tra Digital OTP 4 số"}
    VerifyOTP -->|Sai hoặc chưa tạo| RejectOTP["400 Bad Request (Mã OTP sai)"]
    VerifyOTP -->|Đúng| Settle["Thực hiện chuyển tiền"]
```

---

## 6. SƠ ĐỒ QUAN HỆ CƠ SỞ DỮ LIỆU (ERD)

```mermaid
erDiagram
    user ||--o{ wallet_balances : owns
    user ||--o{ orders : places
    user ||--o{ futures_wallets : owns
    user ||--o{ futures_positions : holds
    user ||--o{ futures_orders : creates
    user ||--o{ payments : initiates
    user ||--o{ refresh_tokens : has

    markets ||--o{ orders : trades_on
    orders ||--o{ trades : fills_into

    futures_instruments ||--o{ futures_positions : defines
    futures_instruments ||--o{ futures_orders : quotes
    futures_orders ||--o{ futures_trades : matches_into
    futures_positions ||--o{ futures_transactions : logs
```
