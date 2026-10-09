#  BACKEND_REQUIREMENTS.md - ĐẶC TẢ YÊU CẦU HỆ THỐNG BACKEND
> **Dự án**: TVN Exchange (Sàn Giao Dịch Tiền Mã Hóa)  
> **Tài liệu**: Đặc tả yêu cầu kỹ thuật & Nghiệp vụ (Requirements Specification)  
> **Phiên bản**: v2.5.0  

---

##  MỤC LỤC
1. [Authentication & Authorization](#1-authentication--authorization)
2. [User Management & Security](#2-user-management--security)
3. [Wallet & Accounting](#3-wallet--accounting)
4. [Spot Trading Engine](#4-spot-trading-engine)
5. [Futures Trading Engine](#5-futures-trading-engine)
6. [Market Data & Sổ Lệnh (Order Book)](#6-market-data--sổ-lệnh-order-book)
7. [Payment Gateway (VNPay)](#7-payment-gateway-vnpay)
8. [Non-Functional Requirements (Phi Chức Năng)](#8-non-functional-requirements)

---

## 1. AUTHENTICATION & AUTHORIZATION

### 1.1 Đăng ký tài khoản (Register)
- **Mô tả**: Cho phép người dùng mới tạo tài khoản để sử dụng hệ thống.
- **Yêu cầu nghiệp vụ**:
  - `email`: Bắt buộc, đúng định dạng email, không được trùng lặp trong hệ thống (`Unique`).
  - `password`: Bắt buộc, tối thiểu 6 ký tự, phải được mã hóa một chiều bằng thuật toán `BCrypt` trước khi lưu vào database.
  - `fullName`: Bắt buộc, từ 2 đến 100 ký tự.
  - `phoneNumber`: Tùy chọn, đúng định dạng số điện thoại.
  - Sau khi đăng ký thành công, tự động khởi tạo các ví Spot mặc định (USDT, BTC, ETH) với số dư ban đầu bằng 0.

### 1.2 Đăng nhập (Login)
- **Mô tả**: Xác thực thông tin người dùng và cấp cặp token JWT.
- **Yêu cầu nghiệp vụ**:
  - Xác thực `email` và `password`. Nếu sai, trả về lỗi `401 Unauthorized` với thông điệp rõ ràng.
  - Khi đăng nhập thành công, sinh:
    - **Access Token**: Thời hạn sống ngắn (24 giờ), chứa `userId`, `email`, `role`.
    - **Refresh Token**: Thời hạn sống dài (7 ngày), lưu trong bảng `refresh_tokens`.

### 1.3 Làm mới token (Refresh Token)
- **Mô tả**: Cho phép client cấp mới Access Token mà không bắt người dùng đăng nhập lại.
- **Yêu cầu nghiệp vụ**:
  - Kiểm tra `refreshToken` có tồn tại trong database và còn hạn sử dụng (`expiryDate > now()`) hay không.
  - Nếu hợp lệ, cấp mới Access Token (và quay vòng Refresh Token nếu cần).

### 1.4 Đăng xuất (Logout)
- **Mô tả**: Hủy phiên làm việc của người dùng.
- **Yêu cầu nghiệp vụ**:
  - Xóa Refresh Token tương ứng trong database.
  - Đưa Access Token hiện tại vào bảng `Blacklisted_tokens` để vô hiệu hóa ngay lập tức.

---

## 2. USER MANAGEMENT & SECURITY

### 2.1 Thông tin cá nhân (Profile)
- **Mô tả**: Lấy và cập nhật thông tin hồ sơ của người dùng đang đăng nhập (`/api/users/me`).
- **Yêu cầu nghiệp vụ**:
  - Trả về thông tin: `id` (UID), `email`, `fullName`, `phoneNumber`, `role`, `createdAt`.
  - Không bao giờ trả về trường `password` hoặc `transferPin` thô.

### 2.2 Đổi mật khẩu đăng nhập (Change Password)
- **Mô tả**: Người dùng chủ động đổi mật khẩu.
- **Yêu cầu nghiệp vụ**:
  - Yêu cầu nhập đúng mật khẩu hiện tại (`oldPassword`).
  - Mật khẩu mới (`newPassword`) phải từ 6 ký tự và khác mật khẩu cũ.

### 2.3 Quản lý Mã Digital OTP 4 Số (Transfer PIN)
- **Mô tả**: Cơ chế mã bảo vệ 4 chữ số chuyên dụng (Digital OTP / Smart OTP MBBank style) để xác thực các giao dịch tài chính nhạy cảm (chuyển tiền P2P), không gửi qua email.
- **Yêu cầu nghiệp vụ**:
  - **Kiểm tra trạng thái (`GET /api/users/me/transfer-pin/status`)**: Trả về `{ "hasTransferPin": true/false }`.
  - **Tạo mã lần đầu (`POST /api/users/me/transfer-pin`)**:
    - Chỉ cho phép tạo khi tài khoản chưa có mã.
  - **Đổi mã OTP (`PUT /api/users/me/transfer-pin`)**:
    - Yêu cầu nhập đúng mã OTP cũ (`oldPin`).
    - Mã OTP mới (`newPin`) không trùng mã cũ.

---

## 3. WALLET & ACCOUNTING

### 3.1 Số dư ví Spot (Wallet Balances)
- **Mô tả**: Quản lý tài sản giao ngay của người dùng cho từng loại tiền tệ (`USDT`, `BTC`, `ETH`...).
- **Cấu trúc trường số dư**:
  - `balance`: Số dư khả dụng (Available), dùng để chuyển tiền hoặc đặt lệnh mới.
  - `lockedBalance`: Số dư bị phong tỏa (Locked), dùng làm tài sản đảm bảo khi có lệnh chờ khớp (Limit order).
- **Quy tắc bảo toàn số dư**: Tổng tài sản = `balance + lockedBalance`. Không bao giờ được âm (`balance >= 0`, `lockedBalance >= 0`).

### 3.2 Nhận tiền thử nghiệm (Faucet Testnet)
- **Mô tả**: Cấp token thử nghiệm miễn phí để người dùng trải nghiệm giao dịch.
- **Yêu cầu**: Cấp một khoản định mức (ví dụ: 10,000 USDT) vào ví Spot của người dùng.

### 3.3 Chuyển ví nội bộ (Spot ⇄ Futures)
- **Mô tả**: Điều chuyển vốn qua lại giữa Ví Spot và Ví Hợp đồng Futures của cùng một tài khoản.
- **Yêu cầu**:
  - Phí chuyển: 0đ.
  - Xử lý tức thời trong Database Transaction.
  - Số tiền chuyển phải nhỏ hơn hoặc bằng số dư khả dụng (`available`) của ví nguồn.

### 3.4 Chuyển tiền P2P giữa các người dùng (User-to-User Transfer)
- **Mô tả**: Chuyển coin trực tiếp từ ví Spot của người gửi sang ví Spot của người nhận thông qua UID người nhận.
- **Yêu cầu**:
  - **Xác thực trước chuyển (`GET /api/v1/wallet/user/{receiverId}`)**:
    - Kiểm tra `receiverId` có tồn tại không.
    - Không cho phép tự chuyển cho chính mình (`senderId != receiverId`).
    - Trả về họ tên người nhận và email đã che (`Nguyễn Văn A (a***@gmail.com)`).
  - **Thực hiện chuyển (`POST /api/v1/wallet/transfer`)**:
    - Người gửi bắt buộc phải đã thiết lập mã OTP chuyển tiền.
    - Mã OTP gửi kèm trong request phải khớp chính xác với mã đã lưu.
    - Số tiền chuyển phải `> 0` và `<= balance` của ví người gửi.
    - Khóa bi quan (`PESSIMISTIC_WRITE`) trên bản ghi ví người gửi và người nhận để đảm bảo chống Double-Spending.
    - Trừ ví người gửi và cộng ví người nhận trong cùng 1 Transaction (`@Transactional`).

---

## 4. SPOT TRADING ENGINE

### 4.1 Đặt lệnh Spot (Create Order)
- **Yêu cầu đầu vào**:
  - `symbol`: Cặp giao dịch hợp lệ (ví dụ: `BTCUSDT`).
  - `side`: `BUY` hoặc `SELL`.
  - `orderType`: `LIMIT` hoặc `MARKET`.
  - `totalQuantity`: Số lượng coin cơ sở muốn mua/bán (`> 0`).
  - `pricePerUnit`: Giá đặt (Bắt buộc với lệnh `LIMIT`, `null` với `MARKET`).
- **Khóa số dư (Balance Locking)**:
  - Lệnh `BUY`: Khóa số dư đồng định giá (USDT) tương ứng `totalQuantity * pricePerUnit + fee`.
  - Lệnh `SELL`: Khóa số dư đồng cơ sở (BTC) tương ứng `totalQuantity`.
  - Nếu số dư khả dụng không đủ: Báo lỗi ngay lập tức, không tạo lệnh.
- **Khớp lệnh (Matching Engine)**:
  - Khớp tự động theo nguyên tắc ưu tiên: **Giá tốt nhất -> Thời gian đặt sớm nhất (Price-Time Priority)**.
  - Hỗ trợ khớp một phần (`PARTIALLY_FILLED`) và khớp toàn phần (`FILLED`).
  - Ghi nhận lịch sử vào bảng `trades`.
  - Hoàn trả số dư thừa (nếu khớp ở giá tốt hơn giá Limit).

### 4.2 Hủy lệnh Spot (Cancel Order)
- **Mô tả**: Hủy lệnh Limit đang mở (`OPEN` hoặc `PARTIALLY_FILLED`).
- **Yêu cầu**:
  - Chỉ chính chủ sở hữu lệnh mới được phép hủy.
  - Đổi trạng thái lệnh sang `CANCELLED`.
  - Hoàn trả và mở khóa ngay lập tức phần số dư còn lại tương ứng `remainingQuantity`.

---

## 5. FUTURES TRADING ENGINE

### 5.1 Đặt lệnh Futures (Create Futures Order)
- **Yêu cầu đầu vào**:
  - `symbol`: Cặp hợp đồng vĩnh cửu (`BTCUSDT`, `ETHUSDT`...).
  - `side`: `BUY` (Mở Long / Đóng Short) hoặc `SELL` (Mở Short / Đóng Long).
  - `orderType`: `MARKET`, `LIMIT`.
  - `leverage`: Đòn bẩy tài chính từ `1x` đến mức tối đa của instrument (ví dụ: `125x`).
  - `totalQuantity`: Số lượng hợp đồng.
  - `reduceOnly`: Boolean (Chỉ giảm vị thế, không tăng quy mô).
- **Quy tắc ký quỹ (Margin Rules - Isolated Mode)**:
  - `Ký quỹ ban đầu (Initial Margin)` = `(Quantity * Price) / Leverage`.
  - Trừ ký quỹ khả dụng từ `FuturesWallet` và chuyển sang `lockedMargin`.
  - Nếu tài khoản đã có lệnh Limit đóng 100% vị thế: Chặn không cho đặt thêm lệnh Reduce-Only thứ hai để tránh rủi ro đảo chiều.

### 5.2 Quản lý vị thế (Position Management)
- **Theo dõi thời gian thực**:
  - `activePos`: Quy mô vị thế (+ Long, - Short).
  - `avgPrice`: Giá vào vị thế bình quân (Entry Price).
  - `liquidationPrice`: Giá thanh lý bắt buộc (tính theo công thức Maintenance Margin).
  - `unrealizedPnl`: Lời/Lỗ chưa chốt tính theo giá Mark Price.
  - `realizedPnl`: Lời/Lỗ đã thực hiện khi đóng từng phần hoặc toàn bộ vị thế.

### 5.3 Cơ chế thanh lý vị thế (Liquidation Engine)
- Khi giá thị trường chạm ngưỡng `liquidationPrice`:
  - Kích hoạt quy trình thanh lý cưỡng chế (Liquidation).
  - Đóng toàn bộ vị thế ở giá thanh lý, tất toán ký quỹ vào quỹ bảo hiểm / hệ thống.

---

## 6. MARKET DATA & SỔ LỆNH (ORDER BOOK)

### 6.1 Dữ liệu thị trường (Ticker 24h)
- Cung cấp giá hiện tại (`currentPrice`), giá cao nhất 24h (`high24h`), giá thấp nhất 24h (`low24h`), khối lượng giao dịch 24h (`volume24h`), tỷ lệ thay đổi giá (`priceChangePercent`).

### 6.2 Sổ lệnh (Order Book Depth)
- Cung cấp danh sách 10-50 mức giá Bids (Mua) và Asks (Bán) gần nhất.
- Hỗ trợ cập nhật độ sâu thời gian thực qua WebSocket STOMP topic `/topic/orderbook/{symbol}`.

---

## 7. PAYMENT GATEWAY (VNPAY)

### 7.1 Tạo liên kết thanh toán nạp tiền
- Nhận số tiền VND người dùng muốn nạp (ví dụ: 2,500,000 VND).
- Sinh mã giao dịch duy nhất `transactionId`.
- Ký mã bảo mật checksum HMAC-SHA512 theo chuẩn VNPay và trả về redirect URL sang cổng thanh toán Sandbox VNPay.

### 7.2 Xử lý IPN & Webhook trả về từ VNPay
- Kiểm tra tính hợp lệ của chữ ký `vnp_SecureHash`.
- Nếu mã phản hồi `vnp_ResponseCode == "00"` (Thành công):
  - Cập nhật trạng thái đơn nạp thành `COMPLETED`.
  - Quy đổi tiền VND sang USDT theo tỷ giá thực tế và cộng tiền vào ví Spot (`WalletBalance`) của người dùng.

---

## 8. NON-FUNCTIONAL REQUIREMENTS (PHI CHỨC NĂNG)

### 8.1 Hiệu năng (Performance) & Độ trễ
- Thời gian phản hồi API thông thường (Read): `< 50ms`.
- Thời gian xử lý đặt lệnh & khớp lệnh qua Kafka: `< 100ms`.

### 8.2 Xử lý đồng thời (Concurrency & Data Integrity)
- **Pessimistic Locking**: Bắt buộc sử dụng `@Lock(LockModeType.PESSIMISTIC_WRITE)` khi truy vấn và cập nhật số dư ví trong các giao dịch chuyển tiền, nạp tiền và khớp lệnh để ngăn ngừa race condition và double-spending.
- **Idempotency**: Các yêu cầu chuyển tiền và thanh toán phải có cơ chế nhận diện tránh xử lý 2 lần (dựa trên `transactionId` hoặc `clientOrderId`).

### 8.3 Xử lý lỗi toàn cục (Global Exception Handling)
- Mọi lỗi đều được chuyển hóa về định dạng JSON thống nhất qua `@RestControllerAdvice`:
  ```json
  {
    "success": false,
    "message": "Chi tiết thông điệp lỗi cho client",
    "data": null
  }
  ```
- Không để lộ chi tiết StackTrace hoặc câu truy vấn cơ sở dữ liệu ra client.

### 8.4 Ghi log (Logging)
- Log đầy đủ mọi hành động nhạy cảm: Đăng nhập thất bại, chuyển tiền P2P, lệnh thanh lý vị thế Futures, nạp tiền VNPay kèm theo `userId`, `timestamp`, `amount`.
