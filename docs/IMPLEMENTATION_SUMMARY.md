# 🛠️ IMPLEMENTATION_SUMMARY.md - TỔNG HỢP HIỆN THỰC HÓA HỆ THỐNG
> **Dự án**: TVN Exchange  
> **Tài liệu**: Báo cáo kỹ thuật chi tiết về cách thức triển khai (Implementation Architecture & Details)  
> **Phiên bản**: v2.5.0  

---

## 📑 MỤC LỤC
1. [Authentication & Session Lifecycle](#1-authentication--session-lifecycle)
2. [User & Digital OTP 4 Số (Smart OTP)](#2-user--digital-otp-4-số-smart-otp)
3. [Wallet & P2P Transfer Engine](#3-wallet--p2p-transfer-engine)
4. [Spot Trading & Order Matching Engine](#4-spot-trading--order-matching-engine)
5. [Futures Trading & Position Management](#5-futures-trading--position-management)
6. [Concurrency Control & Transaction Safety](#6-concurrency-control--transaction-safety)
7. [Messaging (Kafka) & Caching (Redis)](#7-messaging-kafka--caching-redis)
8. [Exception Handling & Response Standardization](#8-exception-handling--response-standardization)
9. [Testing Verification & CI/CD](#9-testing-verification--cicd)

---

## 1. AUTHENTICATION & SESSION LIFECYCLE

### 1.1 Cơ chế triển khai
Hệ thống sử dụng xác thực phi trạng thái (**Stateless Authentication**) dựa trên **JWT (JSON Web Token)** kết hợp với cơ chế **Blacklist Token**:

```
[ Client ] ── POST /api/auth/login ──► [ AuthController ]
                                              │
                                       [ AuthService ]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [ Authenticate with BCrypt ]                       [ Generate JWT Tokens ]
                      │                                               │
             (Check DB User entity)                         Access Token (24h)
                                                            Refresh Token (7d in DB)
```

### 1.2 Thành phần chính
- **`AuthController`**: Định tuyến endpoints `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`, `/api/auth/logout`.
- **`JwtService`**: Chịu trách nhiệm ký mã (HMAC-SHA256), giải mã claims (`id`, `email`, `role`), và kiểm tra hạn sử dụng của token.
- **`JwtAuthenticationFilter`**: Filter chặn mọi request gửi lên, bóc tách header `Authorization: Bearer <token>`, kiểm tra blacklist và nạp `UserDetails` vào `SecurityContextHolder`.
- **`BlacklistedTokenRepository`**: Lưu các access token đã bị vô hiệu hóa khi người dùng chủ động đăng xuất.

---

## 2. USER & DIGITAL OTP 4 SỐ (SMART OTP)

### 2.1 Cơ chế triển khai
Thay vì gửi OTP qua email (vốn có độ trễ lớn, phụ thuộc bên thứ 3 và dễ rơi vào hòm thư spam), hệ thống triển khai giải pháp **Digital OTP 4 số (tương tự Smart OTP MBBank)**:
- Người dùng tự kích hoạt và quản lý mã OTP 4 số trực tiếp trong mục **Hồ sơ & Bảo mật**.
- Mã này được lưu trữ an toàn trong trường `user.transfer_pin`.

```
[ User clicks "Chuyển P2P" ]
            │
    [ Check PIN status ] ── hasTransferPin == false ──► [ Redirect /profile?setupOtp=true ]
            │                                                      │
    hasTransferPin == true                                  [ Create PIN Modal ]
            │                                                      │
    [ Open P2P Modal ] ◄────────────────────────────────── [ Saved to user.transfer_pin ]
```

### 2.2 Thành phần chính
- **`User` Entity**: Bổ sung cột `@Column(name = "transfer_pin", length = 100) private String transferPin;`.
- **`UserServiceImpl`**:
  - `hasTransferPin()`: Kiểm tra người dùng hiện tại đã có mã PIN hay chưa.
  - `createTransferPin(request)`: Đặt mã PIN lần đầu, kiểm tra định dạng 4 chữ số (`^\d{4}$`).
  - `changeTransferPin(request)`: Xác thực mã PIN cũ và cập nhật mã PIN mới.
- **`UserController`**: Cung cấp các API:
  - `GET /api/users/me/transfer-pin/status`
  - `POST /api/users/me/transfer-pin`
  - `PUT /api/users/me/transfer-pin`

---

## 3. WALLET & P2P TRANSFER ENGINE

### 3.1 Cơ chế triển khai
Chuyển tiền P2P thực hiện chuyển đổi số dư trực tiếp giữa 2 bản ghi `WalletBalance` (Spot) của người gửi và người nhận trong một Database Transaction khép kín:

```
[ Sender Request (receiverId, amount, otp) ]
                     │
         [ WalletServiceImpl.transfer() ]
                     │
    1. Verify Sender's OTP Pin matches DB
    2. Check senderId != receiverId
    3. Check sender balance >= amount
                     │
    4. Database Lock (Pessimistic Lock on both Wallets)
       ├── Deduct sender wallet balance
       └── Add receiver wallet balance
                     │
         [ Commit Transaction ]
```

### 3.2 Tra cứu người nhận tự động (Debounced Auto-check)
- Frontend tự động gửi request đến `GET /api/v1/wallet/user/{receiverId}` sau khi người dùng dừng nhập 600ms.
- Backend tra cứu `User` theo ID và trả về:
  ```json
  {
    "fullName": "Nguyễn Văn A",
    "maskedEmail": "a***@gmail.com"
  }
  ```
- Giúp người gửi xác nhận đúng người nhận trước khi nhập OTP và chuyển tiền, hạn chế tuyệt đối chuyển nhầm.

### 3.3 Khắc phục lỗi chu kỳ Polling
- Trong `P2PTransferModal.tsx`, tách `useEffect` reset form chỉ kích hoạt khi `[isOpen]` thay đổi, loại bỏ dependency `[wallets]`. Nhờ đó, việc trang Ví tự động cập nhật số dư định kỳ 4 giây một lần không làm mất dữ liệu UID người nhận đã nhập.

---

## 4. SPOT TRADING & ORDER MATCHING ENGINE

### 4.1 Cơ chế triển khai
Khớp lệnh Spot được thiết kế theo mô hình **Event-Driven với Apache Kafka**:

```
[ Client Order ] ──► [ OrderController ] ──► [ OrderService ]
                                                    │
                                        1. Validate & Lock Wallet Balance
                                        2. Save Order (status: OPEN)
                                        3. Produce Kafka Event: 'spot-orders'
                                                    │
                                                    ▼
                                           [ Apache Kafka ]
                                                    │
                                                    ▼
                                        [ OrderConsumer Listener ]
                                                    │
                                        [ LiveMatchingEngine ]
                                                    │
                                     (Price-Time Priority Match)
                                                    │
                        ┌───────────────────────────┴───────────────────────────┐
                        ▼                                                       ▼
                [ Partial Fill ]                                           [ Full Fill ]
              Update Order status                                       Update Order status
              Create Trade record                                       Create Trade record
              Settle Wallets (Unlock & Credit)                          Settle Wallets
```

### 4.2 Thành phần chính
- **`Order` & `Trade` Entities**: Lưu vết chi tiết từng lệnh đặt và từng giao dịch khớp.
- **`LiveMatchingEngine`**: Duy trì cấu trúc dữ liệu PriorityQueue / TreeMap trong bộ nhớ để ghép cặp lệnh Mua giá cao nhất với lệnh Bán giá thấp nhất với độ trễ cực thấp.
- **`OrderService.cancelOrder()`**: Chuyển trạng thái sang `CANCELLED`, hoàn trả số dư đóng băng chưa khớp về số dư khả dụng ngay lập tức.

---

## 5. FUTURES TRADING & POSITION MANAGEMENT

### 5.1 Cơ chế triển khai
Giao dịch Futures áp dụng mô hình **Ký quỹ riêng biệt (Isolated Margin)** cho các hợp đồng vĩnh cửu (Perpetual):

```
[ Create Futures Order ]
           │
  [ Calculate Margin ] = (Quantity * Price) / Leverage
           │
  [ Deduct Free Margin from FuturesWallet ]
           │
  [ Matching & Execution ]
           │
  [ Update / Create FuturesPosition ]
       ├── activePos: Cập nhật quy mô (+ Long, - Short)
       ├── avgPrice: Tính bình quân gia quyền giá vào
       ├── leverage: Đòn bẩy thiết lập
       └── liquidationPrice: Tính giá thanh lý theo Maintenance Margin Rate
```

### 5.2 Thành phần chính
- **`FuturesOrderService`**: Quản lý đặt lệnh, hủy lệnh, kiểm tra điều kiện Reduce-Only (chặn đặt thêm lệnh đóng vị thế trùng lặp khi đã có lệnh đóng 100%).
- **`FuturesPositionService`**: Tính toán liên tục lãi/lỗ chưa chốt (`unrealizedPnl`) theo giá Mark Price, và giám sát ngưỡng kích hoạt thanh lý (`Liquidation Engine`).
- **`FuturesWalletService`**: Quản lý nạp/rút ký quỹ và chuyển đổi vốn nội bộ Spot ⇄ Futures.

---

## 6. CONCURRENCY CONTROL & TRANSACTION SAFETY

### 6.1 Khóa bi quan (Pessimistic Locking)
Tại tầng Repository, các hàm truy vấn ví để cập nhật số dư đều sử dụng annotation:
```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT w FROM WalletBalance w WHERE w.user.id = :userId AND w.currency = :currency")
Optional<WalletBalance> findByUserIdAndCurrencyWithLock(String userId, String currency);
```
- Khóa bản ghi trên mức row-level của MySQL (`SELECT ... FOR UPDATE`).
- Ngăn chặn hoàn toàn hiện tượng 2 giao dịch đồng thời cùng đọc một số dư cũ và trừ tiền (Double-Spending).

### 6.2 Tính toàn vẹn giao dịch (`@Transactional`)
Mọi luồng thao tác trên từ 2 bảng trở lên (chuyển ví, nạp tiền, khớp lệnh, chuyển P2P) đều được bọc trong `@Transactional(rollbackFor = Exception.class)`. Bất kỳ lỗi logic hoặc ngoại lệ nào xảy ra giữa chừng đều tự động rollback toàn bộ về trạng thái trước đó.

---

## 7. MESSAGING (KAFKA) & CACHING (REDIS)

### 7.1 Apache Kafka (KRaft Mode)
- **Container**: `kafka` chạy trên image `apache/kafka:4.0.0` (cổng `9092`).
- **Topics**:
  - `spot-orders`: Đẩy lệnh Spot mới vào hàng đợi xử lý.
  - `futures-orders`: Đẩy lệnh Futures vào hàng đợi.
  - `market-trades`: Phát sự kiện khớp lệnh thành công để các subscriber cập nhật dữ liệu.

### 7.2 Redis Caching
- **Container**: `trading_redis` chạy trên image `redis:7-alpine` (cổng `6379`).
- **Mục đích**:
  - Lưu trữ tạm thời bảng giá thị trường mới nhất (Ticker 24h).
  - Quản lý phiên và bộ đếm rate-limit.
- **Docker Compose**: Cả Kafka và Redis đều được gom chung vào cùng 1 project Docker có tên `trading` ([`docker-compose.yml`](file:///D:/project/Trading/docker-compose.yml)).

---

## 8. EXCEPTION HANDLING & RESPONSE STANDARDIZATION

### 8.1 Cấu trúc phản hồi đồng nhất (`ApiResponse<T>`)
```java
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
}
```

### 8.2 Xử lý ngoại lệ toàn cục (`GlobalExceptionHandler`)
- `@ExceptionHandler(MethodArgumentNotValidException.class)`: Bắt lỗi validate DTO (`@Valid`, `@NotNull`, `@Size`), trả về thông điệp lỗi trường cụ thể.
- `@ExceptionHandler(BadCredentialsException.class)`: Trả về lỗi 401 khi sai mật khẩu.
- `@ExceptionHandler(BusinessException.class)`: Xử lý các lỗi nghiệp vụ (ví dụ: OTP không đúng, số dư không đủ).

---

## 9. TESTING VERIFICATION & CI/CD

### 9.1 Kiểm thử Backend
- **Framework**: JUnit 5 + Mockito.
- **Trọng tâm kiểm thử**: [`WalletServiceImplTest.java`](file:///D:/project/Trading/Trading/src/test/java/com/slayer/binacet/service/impl/WalletServiceImplTest.java):
  - Chuyển tiền thành công khi OTP hợp lệ.
  - Từ chối chuyển tiền khi chưa thiết lập mã OTP.
  - Từ chối chuyển tiền khi nhập sai mã OTP.
  - Từ chối chuyển tiền khi số dư không đủ.
  - Tự động tạo ví mới cho người nhận nếu người nhận chưa có ví loại coin đó.
- **Kết quả**: **105/105 tests passed cleanly (`BUILD SUCCESS`)**.

### 9.2 Kiểm thử Frontend
- TypeScript strict mode không có lỗi type.
- Lệnh đóng gói `npm run build` hoàn thành trong 1.3s không có cảnh báo nghiêm trọng.
- Vite Dev Server chạy ổn định trên cổng `http://localhost:3000/`.
