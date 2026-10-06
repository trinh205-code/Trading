# 🏛️ PROJECT_BASE.md - TÀI LIỆU THIẾT KẾ BASE DỰ ÁN CHO BACKEND & FRONTEND
> **Dự án**: TVN Exchange (Sàn Giao Dịch Tiền Mã Hóa & Tài Sản Số)  
> **Phiên bản kiến trúc**: v2.5.0  
> **Tác giả / Nhóm phát triển**: TVN Engineering Team  
> **Cập nhật lần cuối**: 2026

---

## 📑 MỤC LỤC
1. [Tổng Quan Kiến Trúc Hệ Thống](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Thiết Kế Base Backend (Spring Boot 3 + Java 21)](#2-thiết-kế-base-backend)
   - [2.1 Cấu Trúc Thư Mục Chuẩn](#21-cấu-trúc-thư-mục-chuẩn)
   - [2.2 Quy Chuẩn Tầng Kiến Trúc (Layered Architecture)](#22-quy-chuẩn-tầng-kiến-trúc)
   - [2.3 Mô Hình Dữ Liệu & Entity Base](#23-mô-hình-dữ-liệu--entity-base)
   - [2.4 Xử Lý Ngoại Lệ & Chuẩn Hóa Response](#24-xử-lý-ngoại-lệ--chuẩn-hóa-response)
   - [2.5 Bảo Mật & Xác Thực (Spring Security 6 + JWT)](#25-bảo-mật--xác-thực)
   - [2.6 Cơ Chế Hàng Đợi Bất Đồng Bộ (Kafka)](#26-cơ-chế-hàng-đợi-bất-đồng-bộ-kafka)
   - [2.7 Giao Thức Thời Gian Thực (WebSocket / STOMP)](#27-giao-thức-thời-gian-thực)
3. [Thiết Kế Base Frontend (React 19 + TypeScript + Vite)](#3-thiết-kế-base-frontend)
   - [3.1 Cấu Trúc Thư Mục Frontend](#31-cấu-trúc-thư-mục-frontend)
   - [3.2 Quản Lý Trạng Thái (Zustand Stores)](#32-quản-lý-trạng-thái-zustand)
   - [3.3 Tầng Giao Tiếp API (Axios Client & Interceptors)](#33-tầng-giao-tiếp-api)
   - [3.4 Tầng Giao Diện & Thiết Kế (Tailwind CSS v4 + Design System)](#34-tầng-giao-diện--thiết-kế)
   - [3.5 Biểu Đồ Kỹ Thuật (TradingView Lightweight Charts)](#35-biểu-đồ-kỹ-thuật)
4. [Quy Chuẩn Giao Tiếp Dữ Liệu (API Contracts)](#4-quy-chuẩn-giao-tiếp-dữ-liệu)
5. [Quy Trình Kiểm Thử & CI/CD](#5-quy-trình-kiểm-thử--cicd)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

TVN Exchange tuân theo mô hình **Client-Server kiến trúc phân tầng (Multi-tier Clean Architecture)** kết hợp với **Event-Driven Architecture** cho các tác vụ khớp lệnh và xử lý khối lượng lớn:

```
[ Client: Web Browser ] 
       │ 
       ├─ HTTPS (RESTful JSON APIs) ──► [ Spring Boot Backend Gateway & Controllers ]
       │                                            │
       └─ WSS (WebSocket / STOMP)   ──► [ Real-time Pub/Sub Broker ]
                                                    │
                                  ┌─────────────────┴─────────────────┐
                                  ▼                                   ▼
                         [ MySQL 8.0 RDBMS ]                [ Apache Kafka Broker ]
                      (User, Wallet, Orders)                 (order-events, trades)
                                                                      │
                                                                      ▼
                                                             [ Match Engine Worker ]
```

### Nguyên tắc cốt lõi:
- **Stateless Services**: Backend không lưu session trên server; sử dụng JWT Bearer token và blacklist trên cache/memory khi logout.
- **Fail-Safe & Idempotency**: Các giao dịch tài chính (Nạp/Rút, Chuyển ví, Chuyển P2P, Khớp lệnh) sử dụng giao dịch cơ sở dữ liệu có khóa cô lập (`@Transactional`, Pessimistic/Optimistic Lock khi cần thiết).
- **Separation of Concerns**: Tách biệt rõ ràng giữa ví Spot và ví Futures, logic khớp lệnh và logic kế toán số dư ví.

---

## 2. THIẾT KẾ BASE BACKEND

### 2.1 Cấu Trúc Thư Mục Chuẩn
Backend được đóng gói chuẩn Maven đa module / package theo domain:

```text
Trading/src/main/java/com/slayer/binacet/
├── config/                  # Các cấu hình hệ thống (Security, WebSocket, Kafka, CORS, VNPay)
├── controller/              # REST API Controllers (nhận request, validate, trả về DTO)
├── dto/
│   ├── request/             # Request payload DTOs (@Valid, @NotNull, @Size...)
│   └── response/            # Response DTOs (chuẩn hóa dữ liệu trả về cho client)
├── entity/                  # JPA Entities (mapping bảng cơ sở dữ liệu MySQL)
├── enums/                   # Các hằng số liệt kê (OrderStatus, OrderType, OrderSide, WalletType...)
├── exception/               # Custom Exceptions & GlobalExceptionHandler (@RestControllerAdvice)
├── repository/              # Spring Data JPA Repositories
├── service/                 # Service Interfaces (định nghĩa hợp đồng nghiệp vụ)
│   └── impl/                # Service Implementations (logic nghiệp vụ chính)
└── util/                    # Helper classes (JWTUtils, SecurityUtils, DateTimeFormatters)
```

---

### 2.2 Quy Chuẩn Tầng Kiến Trúc

#### Tầng Controller (`@RestController`)
- **Chỉ làm nhiệm vụ điều hướng**: Không chứa logic nghiệp vụ tính toán.
- Validate dữ liệu đầu vào qua `@Valid`.
- Luôn trả về đối tượng chuẩn hóa `ApiResponse<T>` hoặc `ResponseEntity<ApiResponse<T>>`.

```java
@PostMapping("/transfer")
public ResponseEntity<ApiResponse<Void>> transfer(@Valid @RequestBody TransferRequest request) {
    Long currentUserId = SecurityUtils.getCurrentUserId();
    walletService.transfer(currentUserId, request);
    return ResponseEntity.ok(ApiResponse.success("Chuyển tiền thành công", null));
}
```

#### Tầng Service (`@Service`)
- Mọi nghiệp vụ phải nằm trong Interface và triển khai tại Implementation (`Impl`).
- Các hàm thay đổi số dư ví bắt buộc phải đánh dấu `@Transactional(rollbackFor = Exception.class)`.
- Kiểm tra tính hợp lệ trước khi thao tác dữ liệu: số dư khả dụng, mã OTP, quyền sở hữu tài sản.

#### Tầng Repository (`@Repository`)
- Sử dụng Spring Data JPA Interface.
- Với các tác vụ cập nhật số dư cạnh tranh cao: sử dụng Query với Khóa bi quan (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) để tránh race condition (Dirty Read / Double Spending).

---

### 2.3 Mô Hình Dữ Liệu & Entity Base

Hệ sinh thái Entity cốt lõi gồm:
1. **`User`**:
   - `id`: Định danh người dùng duy nhất (UID hiển thị giao dịch).
   - `email`, `password`: Đăng nhập cơ bản (mật khẩu mã hóa BCrypt).
   - `fullName`, `phoneNumber`: Thông tin hồ sơ cá nhân.
   - `transferPin`: Mã Digital OTP 4 số (mã hóa hoặc lưu trữ bảo mật dùng để xác thực chuyển tiền P2P).
   - `role`: Phân quyền (USER, ADMIN).
2. **`WalletBalance` (Ví Spot)**:
   - `id`, `user`: Chủ sở hữu.
   - `currency`: Ký hiệu tiền tệ (`USDT`, `BTC`, `ETH`...).
   - `balance`: Số dư khả dụng (Available).
   - `lockedBalance`: Số dư đóng băng (Locked khi đặt lệnh Limit).
3. **`FuturesWallet` (Ví Futures)**:
   - `balance`, `lockedBalance`: Phục vụ ký quỹ và thanh toán lãi/lỗ phái sinh.
4. **`Order` (Spot Orders)**:
   - `id`, `symbol`, `side` (`BUY`/`SELL`), `orderType` (`MARKET`/`LIMIT`), `pricePerUnit`, `totalQuantity`, `remainingQuantity`, `status` (`OPEN`, `FILLED`, `CANCELLED`).
5. **`FuturesOrder` & `FuturesPosition`**:
   - Quản lý vị thế Isolated Long/Short, giá thanh lý (`liquidationPrice`), đòn bẩy (`leverage`), margin.

---

### 2.4 Xử Lý Ngoại Lệ & Chuẩn Hóa Response

Mọi phản hồi từ hệ thống đều tuân thủ cấu trúc đồng nhất:

```json
{
  "success": true,
  "message": "Thông điệp xử lý",
  "data": { ... }
}
```

Khi có lỗi:
```json
{
  "success": false,
  "message": "Nội dung lỗi chi tiết",
  "errorCode": "INVALID_OTP",
  "data": null
}
```

#### GlobalExceptionHandler (`@RestControllerAdvice`)
- Bắt tất cả các loại ngoại lệ (`MethodArgumentNotValidException`, `BadCredentialsException`, `CustomBusinessException`, `EntityNotFoundException`).
- Trả về HTTP Status code phù hợp (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Error).

---

### 2.5 Bảo Mật & Xác Thực (Spring Security 6 + JWT)

- **JWT Filter (`JwtAuthenticationFilter`)**: Bắt đầu chuỗi lọc, trích xuất `Authorization: Bearer <token>`, giải mã và nạp `UserDetails` vào `SecurityContextHolder`.
- **Public Endpoints**: `/api/auth/**`, `/api/market/**`, `/ws/**`.
- **Protected Endpoints**: `/api/v1/wallet/**`, `/api/orders/**`, `/api/futures/**`, `/api/users/me/**`.
- **Digital OTP Security**:
  - Không truyền OTP qua email mà áp dụng cơ chế Smart/Digital OTP tương tự ứng dụng ngân hàng số MBBank.
  - Mã PIN 4 chữ số bảo mật lưu trữ trực tiếp trên tài khoản người dùng (`User.transferPin`).
  - Giao dịch chuyển tiền P2P bắt buộc truyền đúng 4 số PIN hợp lệ mới thực hiện trừ/cộng số dư.

---

### 2.6 Cơ Chế Hàng Đợi Bất Đồng Bộ (Kafka)
- **Topic `spot-orders`**: Nhận các yêu cầu đặt lệnh mới từ người dùng.
- **Consumer**: Lắng nghe và đẩy vào Match Engine trong RAM để tối ưu tốc độ xử lý khớp lệnh hàng chục nghìn TPS mà không nghẽn database.
- **Topic `market-trades`**: Phát tín hiệu khi có giao dịch khớp thành công để cập nhật bảng lịch sử và nến biểu đồ.

---

### 2.7 Giao Thức Thời Gian Thực (WebSocket / STOMP)
- Endpoint: `/ws/trading`
- Subscriptions:
  - `/topic/ticker/{symbol}`: Cập nhật giá thời gian thực.
  - `/topic/orderbook/{symbol}`: Cập nhật độ sâu sổ lệnh.
  - `/user/queue/orders`: Cập nhật trạng thái lệnh riêng của từng user.

---

## 3. THIẾT KẾ BASE FRONTEND

### 3.1 Cấu Trúc Thư Mục Frontend

```text
FrontEnd/src/
├── api/                     # Axios API clients (authApi, walletApi, orderApi, futuresApi, userApi)
├── assets/                  # Ảnh, fonts, tài nguyên tĩnh
├── components/              # Reusable React UI Components
│   ├── common/              # Các nút, input, badge, icon coin, modal khung chung
│   ├── layout/              # Header, Footer, Sidebar, Navigation
│   ├── trading/             # OrderBook, TradeHistory, OrderForm, Chart, ExportReportModal
│   └── wallet/              # P2PTransferModal, CreateTransferPinModal, ChangeTransferPinModal...
├── hooks/                   # Custom React Hooks (useWebSocket, useDebounce, useLocalStorage)
├── pages/                   # Các trang định tuyến (Route Views)
│   ├── Auth/                # LoginPage, RegisterPage
│   ├── BuyCrypto/           # Mua tài sản số qua VNPay, lịch sử nạp
│   ├── Home/                # Trang chủ sàn giao dịch
│   ├── Profile/             # Hồ sơ tài khoản, Đổi mật khẩu, Quản lý Digital OTP 4 số
│   ├── Trading/             # Màn hình giao dịch Spot & Futures
│   └── Wallet/              # Trang Quản lý Ví, Báo cáo PnL, Trung tâm lệnh
├── stores/                  # Zustand Global State Stores (authStore, walletStore, marketStore, orderStore)
├── types/                   # TypeScript Interfaces & Types
├── utils/                   # Hàm tiện ích (formatNumber, orderFormatters, excelExporter)
├── App.tsx                  # Root Routing Component
└── main.tsx                 # Entry point ứng dụng
```

---

### 3.2 Quản Lý Trạng Thái (Zustand Stores)
Sử dụng **Zustand** làm state management chính vì sự gọn nhẹ, không boilerplate, hiệu năng cao và hỗ trợ TypeScript hoàn hảo:
- `authStore`: Lưu trữ `user`, `token`, `isAuthenticated`, các actions `login`, `logout`, `fetchProfile`.
- `walletStore`: Quản lý danh sách ví `wallets`, tổng tài sản, hành động `claimFaucet`, `fetchWallets`.
- `marketStore`: Lưu danh sách các cặp tiền thị trường, giá hiện tại, biến động 24h.
- `orderStore`: Quản lý danh sách lệnh đang mở, lịch sử lệnh, phân trang.

---

### 3.3 Tầng Giao Tiếp API (Axios Client & Interceptors)
Tất cả các lệnh gọi API thông qua instance `axiosClient` cấu hình tại `FrontEnd/src/api/axiosClient.ts`:
- **Request Interceptor**: Tự động đính kèm `Bearer <token>` từ `localStorage` vào mọi request gửi đi.
- **Response Interceptor**:
  - Tự động trích xuất dữ liệu trả về `response.data`.
  - Bắt lỗi `401 Unauthorized`: Xóa token và điều hướng về trang đăng nhập nếu token hết hạn hoặc không hợp lệ.
  - Xử lý thông điệp lỗi tập trung từ backend.

---

### 3.4 Tầng Giao Diện & Thiết Kế (Tailwind CSS v4 + Design System)
- **Chế độ màu**: Dark Theme cao cấp chuẩn quốc tế (nền chính `#000000`, bề mặt card `#121212` và `#181a20`, viền `#1e1e1e` và `#2b313a`).
- **Màu nhận diện thương hiệu TVN**:
  - Logo: Khối **`[ V ★ N ]`** nền đỏ cờ Tổ quốc (`#da251d`), chữ trắng, ngôi sao vàng (`#ffde00`), chữ **`T`** màu trắng thanh lịch.
  - Màu hành động mua / tăng giá: Xanh ngọc lục bảo (`#00c076`).
  - Màu hành động bán / giảm giá: Đỏ hồng ngoại (`#ff4d4f` hoặc `#ea3943`).
- **Typography**: Phông chữ chuẩn `Be Vietnam Pro` hỗ trợ hoàn hảo hiển thị tiếng Việt, số liệu tài chính rõ nét, không bị nhòe.

---

### 3.5 Biểu Đồ Kỹ Thuật (TradingView Lightweight Charts)
- Sử dụng thư viện `lightweight-charts` hiệu năng siêu cao, mượt mà 60fps trên mọi thiết bị.
- Hỗ trợ đổi khung nến đa dạng (`1m`, `5m`, `15m`, `1h`, `4h`, `1D`).
- Vẽ thanh Volume đồng bộ với nến giá.
- Tự động resize mượt mà khi người dùng thay đổi kích thước cửa sổ trình duyệt.

---

## 4. QUY CHUẨN GIAO TIẾP DỮ LIỆU (API CONTRACTS)

### 4.1 Quản Lý Mã OTP Chuyển Tiền (Digital OTP 4 số)
| Phương thức | Đường dẫn API | Mô tả | Yêu cầu xác thực |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/me/transfer-pin/status` | Lấy trạng thái đã tạo mã OTP hay chưa | `Bearer Token` |
| `POST` | `/api/users/me/transfer-pin` | Thiết lập mã OTP 4 số lần đầu | `Bearer Token` |
| `PUT` | `/api/users/me/transfer-pin` | Đổi mã OTP (yêu cầu mã cũ + mã mới) | `Bearer Token` |

### 4.2 Giao Dịch Chuyển Tiền Nội Bộ P2P
| Phương thức | Đường dẫn API | Mô tả | Payload chính |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/wallet/user/{receiverId}` | Tra cứu thông tin người nhận trước khi chuyển | `receiverId` (UID) |
| `POST` | `/api/v1/wallet/transfer` | Thực hiện chuyển tiền giữa 2 ví Spot | `receiverId`, `currency`, `amount`, `otp` (4 số) |

### 4.3 Quản Lý Ví & Faucet
| Phương thức | Đường dẫn API | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/v1/wallet/me` | Lấy danh sách ví Spot của người dùng |
| `POST` | `/api/v1/wallet/faucet` | Cấp token thử nghiệm miễn phí |
| `POST` | `/api/futures/wallet/transfer-in` | Chuyển tiền từ ví Spot sang ví Futures |
| `POST` | `/api/futures/wallet/transfer-out` | Chuyển tiền từ ví Futures về ví Spot |

---

## 5. QUY TRÌNH KIỂM THỬ & CI/CD

1. **Backend Testing**:
   - Sử dụng **JUnit 5** + **Mockito**.
   - Kiểm thử toàn diện các luồng ví: nạp tiền, trừ tiền, chuyển ví nội bộ, chuyển tiền P2P với mã OTP hợp lệ/không hợp lệ/chưa tạo mã.
   - Lệnh thực thi: `mvn test` (đảm bảo 100% test suites passed).
2. **Frontend Verification**:
   - Kiểm tra kiểu dữ liệu với TypeScript Compiler (`tsc`).
   - Kiểm thử đóng gói với Vite: `npm run build`.
3. **Quy chuẩn Git & Commit**:
   - Tuân theo chuẩn Conventional Commits: `feat:`, `fix:`, `style:`, `refactor:`, `docs:`.
