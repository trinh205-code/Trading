#  API_DOCUMENTATION.md - TÀI LIỆU CHI TIẾT API HỆ THỐNG
> **Dự án**: TVN Exchange  
> **Base URL**: `http://localhost:8080`  
> **Phiên bản API**: v2.5.0  
> **Định dạng dữ liệu**: `application/json`  

---

##  MỤC LỤC
1. [Quy Chuẩn Chung (General Convention)](#1-quy-chuẩn-chung)
2. [Authentication APIs (`/api/auth`)](#2-authentication-apis)
3. [User & Digital OTP APIs (`/api/users`)](#3-user--digital-otp-apis)
4. [Wallet & P2P Transfer APIs (`/api/v1/wallet`)](#4-wallet--p2p-transfer-apis)
5. [Spot Order APIs (`/api/orders`)](#5-spot-order-apis)
6. [Market Data APIs (`/api/market`)](#6-market-data-apis)
7. [Futures Trading APIs (`/api/futures`)](#7-futures-trading-apis)
8. [Payment VNPay APIs (`/api/payment`)](#8-payment-vnpay-apis)

---

## 1. QUY CHUẨN CHUNG

### 1.1 Headers
| Tên Header | Giá trị | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `Content-Type` | `application/json` | Có (với POST/PUT) | Định dạng dữ liệu gửi |
| `Authorization` | `Bearer <token>` | Có (với Protected API) | JWT Token xác thực người dùng |

### 1.2 Cấu trúc phản hồi chuẩn (Response Wrapper)
- **Thành công**:
  ```json
  {
    "success": true,
    "message": "Mô tả kết quả thành công",
    "data": { ... }
  }
  ```
- **Thất bại**:
  ```json
  {
    "success": false,
    "message": "Nội dung lỗi chi tiết",
    "data": null
  }
  ```

---

## 2. AUTHENTICATION APIS

### 2.1 Đăng ký tài khoản (Register)
- **URL**: `POST /api/auth/register` (hoặc `POST /api/auth`)
- **Yêu cầu đăng nhập**: Không
- **Body**:
  ```json
  {
    "fullName": "Nguyễn Văn A",
    "email": "user@example.com",
    "password": "Password123!",
    "phoneNumber": "0987654321"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Đăng ký tài khoản thành công",
    "data": {
      "id": "c1a2b3c4-...",
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "phoneNumber": "0987654321",
      "role": "USER"
    }
  }
  ```

### 2.2 Đăng nhập (Login)
- **URL**: `POST /api/auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Đăng nhập thành công",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "d7a8b9c0-...",
      "tokenType": "Bearer",
      "expiresIn": 86400000,
      "user": {
        "id": "c1a2b3c4-...",
        "email": "user@example.com",
        "fullName": "Nguyễn Văn A",
        "role": "USER"
      }
    }
  }
  ```

### 2.3 Làm mới Token (Refresh Token)
- **URL**: `POST /api/auth/refresh`
- **Body**:
  ```json
  {
    "refreshToken": "d7a8b9c0-..."
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Cấp lại token thành công",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "d7a8b9c0-..."
    }
  }
  ```

### 2.4 Đăng xuất (Logout)
- **URL**: `POST /api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "refreshToken": "d7a8b9c0-..."
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Đăng xuất thành công",
    "data": null
  }
  ```

---

## 3. USER & DIGITAL OTP APIS

### 3.1 Xem thông tin hồ sơ của tôi (Get My Profile)
- **URL**: `GET /api/users/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Lấy thông tin cá nhân thành công",
    "data": {
      "id": "c1a2b3c4-...",
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "phoneNumber": "0987654321",
      "role": "USER",
      "createdAt": "2026-10-06T10:00:00Z"
    }
  }
  ```

### 3.2 Đổi mật khẩu đăng nhập (Change Password)
- **URL**: `PUT /api/users/me/password`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "oldPassword": "Password123!",
    "newPassword": "NewPassword456!"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "đổi mật khẩu thành công",
    "data": null
  }
  ```

### 3.3 Tra cứu trạng thái Mã OTP chuyển tiền
- **URL**: `GET /api/users/me/transfer-pin/status`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Lấy trạng thái mã OTP thành công",
    "data": {
      "hasTransferPin": true
    }
  }
  ```

### 3.4 Tạo Mã OTP chuyển tiền lần đầu (Create Transfer PIN)
- **URL**: `POST /api/users/me/transfer-pin`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "pin": "6868"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Thiết lập mã OTP chuyển tiền thành công",
    "data": null
  }
  ```

### 3.5 Đổi Mã OTP chuyển tiền (Change Transfer PIN)
- **URL**: `PUT /api/users/me/transfer-pin`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "oldPin": "6868",
    "newPin": "8888"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Đổi mã OTP chuyển tiền thành công",
    "data": null
  }
  ```

---

## 4. WALLET & P2P TRANSFER APIS

### 4.1 Lấy danh sách số dư ví Spot (Get My Wallets)
- **URL**: `GET /api/v1/wallet/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "w1...",
        "currency": "USDT",
        "balance": 5000.0,
        "lockedBalance": 200.0
      },
      {
        "id": "w2...",
        "currency": "BTC",
        "balance": 0.5,
        "lockedBalance": 0.0
      }
    ]
  }
  ```

### 4.2 Nhận Faucet Testnet
- **URL**: `POST /api/v1/wallet/faucet`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`): Trả về thông tin ví sau khi được cộng coin thử nghiệm.

### 4.3 Tra cứu thông tin người nhận theo UID (Get Receiver Info)
- **URL**: `GET /api/v1/wallet/user/{receiverId}`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Tìm thấy thông tin người nhận",
    "data": {
      "fullName": "Trần Thị B",
      "maskedEmail": "b***@gmail.com"
    }
  }
  ```

### 4.4 Chuyển tiền P2P nội bộ (P2P Transfer)
- **URL**: `POST /api/v1/wallet/transfer`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "receiverId": "3b2c1a0-...",
    "currency": "USDT",
    "amount": 100.5,
    "otp": "8888"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Chuyển tiền thành công",
    "data": null
  }
  ```

---

## 5. SPOT ORDER APIS

### 5.1 Đặt lệnh Spot (Create Order)
- **URL**: `POST /api/orders`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "symbol": "BTCUSDT",
    "side": "BUY",
    "orderType": "LIMIT",
    "price": 64000.0,
    "quantity": 0.05
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Đặt lệnh thành công",
    "data": {
      "id": "ord-1234...",
      "symbol": "BTCUSDT",
      "side": "BUY",
      "orderType": "LIMIT",
      "pricePerUnit": 64000.0,
      "totalQuantity": 0.05,
      "remainingQuantity": 0.05,
      "status": "OPEN",
      "createdAt": "2026-10-06T15:30:00Z"
    }
  }
  ```

### 5.2 Hủy lệnh Spot (Cancel Order)
- **URL**: `POST /api/orders/{id}/cancel`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Hủy lệnh thành công",
    "data": {
      "id": "ord-1234...",
      "status": "CANCELLED"
    }
  }
  ```

### 5.3 Danh sách lệnh của tôi (Get My Orders)
- **URL**: `GET /api/orders?symbol=BTCUSDT&page=0&size=10`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`): Danh sách phân trang (`Page<OrderResponse>`).

### 5.4 Lịch sử khớp lệnh của tôi (Get My Trades)
- **URL**: `GET /api/orders/trades?symbol=BTCUSDT&page=0&size=10`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`): Danh sách phân trang (`Page<TradeResponse>`).

---

## 6. MARKET DATA APIS

### 6.1 Lấy toàn bộ bảng giá thị trường 24h
- **URL**: `GET /api/market/prices`
- **Headers**: Không yêu cầu

### 6.2 Lấy chi tiết giá 1 cặp coin
- **URL**: `GET /api/market/price/{symbol}` (Ví dụ: `/api/market/price/BTCUSDT`)

### 6.3 Lấy sổ lệnh độ sâu (Order Book Depth)
- **URL**: `GET /api/market/order-book/{symbol}`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "symbol": "BTCUSDT",
      "bids": [
        { "price": "64200.00", "quantity": "1.520" },
        { "price": "64190.00", "quantity": "0.800" }
      ],
      "asks": [
        { "price": "64210.00", "quantity": "0.450" },
        { "price": "64220.00", "quantity": "2.100" }
      ]
    }
  }
  ```

---

## 7. FUTURES TRADING APIS

### 7.1 Lấy danh mục Instruments hợp đồng Futures
- **URL**: `GET /api/futures/instruments`

### 7.2 Lấy số dư ví Futures
- **URL**: `GET /api/futures/wallet`
- **Headers**: `Authorization: Bearer <token>`

### 7.3 Chuyển tiền từ Spot sang Futures (Transfer In)
- **URL**: `POST /api/futures/wallet/transfer-in`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "currency": "USDT", "amount": 500.0 }`

### 7.4 Chuyển tiền từ Futures về Spot (Transfer Out)
- **URL**: `POST /api/futures/wallet/transfer-out`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "currency": "USDT", "amount": 200.0 }`

### 7.5 Lấy danh sách vị thế đang mở (Get Positions)
- **URL**: `GET /api/futures/positions`
- **Headers**: `Authorization: Bearer <token>`

### 7.6 Đặt lệnh Futures (Create Futures Order)
- **URL**: `POST /api/futures/orders`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "symbol": "BTCUSDT",
    "side": "BUY",
    "orderType": "LIMIT",
    "price": 64000.0,
    "quantity": 0.1,
    "leverage": 20,
    "reduceOnly": false
  }
  ```

### 7.7 Hủy lệnh Futures
- **URL**: `POST /api/futures/orders/{id}/cancel`
- **Headers**: `Authorization: Bearer <token>`

---

## 8. PAYMENT VNPAY APIS

### 8.1 Tạo yêu cầu nạp tiền VNPay
- **URL**: `POST /api/payment/vnpay-create`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "amountVnd": 2500000,
    "bankCode": ""
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=..."
    }
  }
  ```

### 8.2 Lịch sử nạp tiền
- **URL**: `GET /api/payment/history?page=0&size=10`
- **Headers**: `Authorization: Bearer <token>`
