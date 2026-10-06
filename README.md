# 🚀 TVN Exchange - Nền Tảng Giao Dịch Tiền Mã Hoá (Crypto Exchange)

<div align="center">

![TVN Exchange Banner](https://img.shields.io/badge/TVN-EXCHANGE-da251d?style=for-the-badge&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Kafka](https://img.shields.io/badge/Apache%20Kafka-231F20?style=for-the-badge&logo=apachekafka&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Hệ thống sàn giao dịch tiền mã hóa hiệu năng cao, hỗ trợ giao dịch Giao ngay (Spot), Hợp đồng tương lai (Futures), Chuyển tiền P2P bảo mật bằng Digital OTP 4 số thời gian thực.**

[Tính Năng](#-tính-năng-chính) • [Tài Liệu Base](#-tài-liệu-thiết-kế--tổng-kết) • [Kiến Trúc](#-kiến-trúc-hệ-thống) • [Công Nghệ](#-công-nghệ-sử-dụng) • [Cài Đặt & Chạy](#-hướng-dẫn-cài-đặt--khởi-chạy) • [Cấu Trúc Thư Mục](#-cấu-trúc-thư-mục)

</div>

---

## 📚 TÀI LIỆU THIẾT KẾ & TỔNG KẾT
- 🏛️ **[PROJECT_BASE.md](PROJECT_BASE.md)**: Tài liệu thiết kế Base dự án cho Backend (Spring Boot 3 + Java 21) & Frontend (React 19 + TypeScript + Vite + Tailwind CSS v4).
- 📋 **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)**: Báo cáo tổng kết toàn bộ tính năng đã triển khai, danh mục APIs, bảng cơ sở dữ liệu và kết quả kiểm thử.

---

## 📖 Giới Thiệu Dự Án

**TVN Exchange** là nền tảng giao dịch tài sản số toàn diện được xây dựng theo tiêu chuẩn của các sàn giao dịch quốc tế hàng đầu (như Binance, OKX). Hệ thống cung cấp trải nghiệm giao dịch mượt mà với độ trễ siêu thấp, nhận diện thương hiệu tự hào Việt Nam với logo khối cờ Tổ quốc `[ V ★ N ]` nền đỏ sao vàng, giao diện tối ưu hóa typography `Be Vietnam Pro`, và khả năng xử lý khối lượng lệnh lớn thông qua cơ chế hàng đợi bất đồng bộ **Apache Kafka**.

---

## ✨ Tính Năng Chính

### 1. 🤝 Chuyển Tiền P2P Nội Bộ & Digital OTP 4 Số (Mới)
- **Digital OTP bảo mật (Smart OTP MBBank style)**: Mã PIN 4 chữ số lưu trữ trực tiếp trên tài khoản người dùng (`User.transferPin`), không gửi qua email, giúp giao dịch tức thì và bảo mật tuyệt đối.
- **Tự động chuyển hướng tạo OTP**: Nếu tài khoản chưa tạo mã OTP, khi bấm "Chuyển P2P", hệ thống tự động điều hướng sang trang **Hồ sơ & Bảo mật** (`/profile?setupOtp=true`) để kích hoạt.
- **Tự động nhận diện người nhận (Debounced Auto-check)**: Khi dán hoặc nhập UID người nhận, hệ thống tự động tra cứu và hiển thị tên người nhận cùng email ẩn danh (`Nguyễn Văn A (a***@gmail.com)`).
- **Chuyển tiền tức thời giữa 2 ví Spot (`WalletBalance`)**: Thực hiện an toàn trong một Database Transaction duy nhất.

### 2. 🛡️ Trang Hồ Sơ & Bảo Mật (`/profile`)
- Quản lý thông tin tài khoản: UID, Họ tên, Email, Số điện thoại, Trạng thái tài khoản đã xác thực.
- Quản lý riêng biệt cho **Mã OTP Chuyển Tiền (Digital OTP)**:
  - Hiển thị huy hiệu trạng thái: `✓ Đã kích hoạt` / `⚠ Chưa thiết lập`.
  - Nút thiết lập mã OTP lần đầu.
  - Nút đổi mã OTP (yêu cầu nhập mã cũ và mã mới).
- Quản lý **Mật khẩu đăng nhập**: Cập nhật mật khẩu bảo vệ tài khoản.

### 3. 📈 Giao Dịch Giao Ngay (Spot Trading)
- **Đa dạng loại lệnh**: Lệnh Thị trường (`MARKET`) và Lệnh Giới hạn (`LIMIT`) cho cả hai chiều Mua (`BUY`) và Bán (`SELL`).
- **Khớp lệnh tức thời**: Cơ chế khớp lệnh tốc độ cao (`Matching Engine`).
- **Sổ lệnh thời gian thực (Order Book Depth)**: Hiển thị độ sâu thị trường, tỷ lệ Bán/Mua trực quan, cập nhật tự động qua WebSocket.
- **Hủy lệnh & Hoàn tiền thông minh**: Hoàn trả và mở khóa số dư ví ngay lập tức khi hủy lệnh mở.

### 4. ⚡ Giao Dịch Hợp Đồng Tương Lai (Futures Trading)
- **Ký quỹ Isolated Margin**: Quản lý rủi ro độc lập cho từng vị thế mở.
- **Đòn bẩy tài chính linh hoạt**: Tùy chỉnh mức đòn bẩy phù hợp với khẩu vị rủi ro.
- **Lệnh Giảm vị thế (Reduce-Only)**: Đảm bảo chỉ đóng hoặc thu hẹp vị thế mà không vô tình đảo chiều vị thế.
- **Kiểm soát rủi ro thông minh**: Ngăn chặn người dùng đặt trùng lặp lệnh đóng 100% vị thế bằng lệnh Limit thứ hai (chuẩn rủi ro sàn lớn).
- **Tính toán rủi ro thời gian thực**: Tự động tính Giá thanh lý (Liquidation Price), Ký quỹ duy trì (Maintenance Margin), Lời/Lỗ chưa chốt (Unrealized PnL) và Lời/Lỗ đã chốt (Realized PnL).

### 5. 📊 Biểu Đồ & Dữ Liệu Thị Trường (Trading Terminal)
- **TradingView Charts chuyên nghiệp**: Tích hợp thư viện đồ thị `lightweight-charts` với đầy đủ các khung thời gian: `1m`, `5m`, `15m`, `1h`, `4h`, `1D`.
- **Thống kê 24h đa chiều**: Giá cao nhất, giá thấp nhất, khối lượng giao dịch 24h, biên độ dao động giá theo thời gian thực.
- **Chuyển đổi cặp coin nhanh chóng**: Tìm kiếm và chọn nhanh các cặp giao dịch phổ biến (BTC/USDT, ETH/USDT, SOL/USDT, BNB/USDT, XRP/USDT...).

### 6. 💼 Quản Lý Ví & Tài Sản Đa Năng
- **Phân tách ví chuẩn mực**: 
  - **Ví Spot**: Quản lý tài sản giao ngay.
  - **Ví Futures**: Phục vụ ký quỹ và quản lý lệnh phái sinh.
- **Chuyển ví nội bộ tức thời (Spot ⇄ Futures)**: Chuyển đổi số dư giữa các ví với phí 0 đồng trong vòng vài mili-giây.
- **Cổng nạp tiền VNPay**: Tích hợp cổng thanh toán Sandbox VNPay cho phép nạp tiền pháp định (VND) trực tiếp.
- **Faucet Testnet**: Nhận coin thử nghiệm miễn phí để trải nghiệm toàn bộ tính năng giao dịch.
- **Biểu đồ phân tích tài sản & PnL**: Trực quan hóa dòng tiền và hiệu quả danh mục đầu tư.

### 7. 📑 Trung Tâm Lệnh & Xuất Báo Cáo Giao Dịch
- **Tích hợp đồng bộ trong Trang Ví**: Xem toàn bộ lịch sử lệnh Spot, lệnh Futures, lịch sử khớp lệnh mà không cần chuyển hướng trang.
- **Lọc thông minh**: Tìm kiếm theo cặp tiền, trạng thái lệnh và **khoảng thời gian tùy chỉnh** (Từ ngày - Đến ngày).
- **Phân trang linh hoạt**: Phân trang chuẩn UX cho phép duyệt qua hàng nghìn lịch sử giao dịch.
- **Xuất báo cáo Excel (`.xlsx`)**: Tải về file Excel chuyên nghiệp với độ rộng cột thoáng, căn chỉnh dữ liệu chuẩn tài chính, mã màu trạng thái rõ ràng.

---

## 🏗️ Kiến Trúc Hệ Thống

```
                     ┌─────────────────────────────────────────┐
                     │          React 19 Frontend              │
                     │  (Vite + Tailwind v4 + TradingView)     │
                     └───────────────┬─────────────────────────┘
                                     │
                    HTTPS REST API   │   STOMP / WebSocket
                                     ▼
                     ┌─────────────────────────────────────────┐
                     │         Spring Boot Backend API         │
                     │   (Security, Controllers, Services)     │
                     └───────┬─────────────────────────┬───────┘
                             │                         │
            Order Events     ▼                         ▼   SQL Queries
      ┌───────────────────────────────┐       ┌─────────────────┐
      │     Apache Kafka Cluster      │       │  MySQL Database │
      │  (Order Placement & Matching) │       │ (Users, Orders, │
      └──────────────┬────────────────┘       │ Wallets, Trades)│
                     │                        └─────────────────┘
                     ▼
      ┌───────────────────────────────┐
      │      Kafka Order Consumer     │
      │    & Real-time Match Engine   │
      └───────────────────────────────┘
```

---

## 💻 Công Nghệ Sử Dụng

### Frontend
| Công nghệ | Phiên bản | Mục đích sử dụng |
| :--- | :--- | :--- |
| **React** | `19.2.x` | Xây dựng giao diện người dùng theo Component-based |
| **TypeScript** | `5.x` | Đảm bảo tính toàn vẹn kiểu dữ liệu tĩnh |
| **Vite** | `8.2.x` | Công cụ đóng gói và máy chủ phát triển cực nhanh |
| **Tailwind CSS** | `v4.3.x` | Khung styling hiện đại, hiệu năng cao |
| **Lightweight Charts** | `5.2.x` | Biểu đồ nến TradingView tương tác thời gian thực |
| **Zustand** | `5.0.x` | Quản lý Global State nhẹ, hiệu quả |
| **SockJS / STOMP** | `7.3.x` | Kết nối WebSocket nhận cập nhật giá và lệnh |
| **SheetJS (xlsx)** | `0.18.x` | Tạo và xuất file Excel báo cáo giao dịch |
| **Lucide React** | `1.31.x` | Bộ icon chuẩn hiện đại |

### Backend
| Công nghệ | Phiên bản | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Java** | `21` (LTS) | Ngôn ngữ lập trình chính với hiệu năng cao |
| **Spring Boot** | `3.x` | Framework nền tảng xây dựng REST API & WebSocket |
| **Spring Security** | `6.x` | Bảo mật hệ thống, cấu hình CORS, phân quyền |
| **Spring Data JPA** | `3.x` | Quản lý tầng truy xuất dữ liệu ORM với Hibernate |
| **Apache Kafka** | `3.x` | Event streaming và hàng đợi xử lý lệnh quy mô lớn |
| **MySQL** | `8.0` | Hệ quản trị cơ sở dữ liệu quan hệ |
| **JWT (jjwt)** | `0.11.x` | Tạo và xác thực Access Token / Refresh Token |
| **VNPay SDK** | `2.1.0` | Tích hợp cổng thanh toán trực tuyến |

---

## 📁 Cấu Trúc Thư Mục

```text
Trading/
├── BACKEND_REQUIREMENTS.md       # Tài liệu đặc tả tích hợp API Backend
├── IMPLEMENTATION_SUMMARY.md     # Báo cáo tổng kết triển khai & danh mục API
├── PROJECT_BASE.md               # Tài liệu thiết kế Base Backend & Frontend
├── README.md                     # Tài liệu hướng dẫn dự án tổng quan
│
├── FrontEnd/                     # Ứng dụng Frontend (React + TypeScript)
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── api/                  # Axios instances & API service calls (userApi, walletApi, ...)
│       ├── components/
│       │   ├── common/           # Modal, Input, Pagination, Buttons
│       │   ├── layout/           # Header, Footer (TVN Logo [V★N]), Navigation
│       │   ├── trading/          # BuySellForm, OrderBook, Chart, Ticker
│       │   └── wallet/           # P2PTransferModal, CreatePinModal, ChangePinModal, ProfitChart
│       ├── hooks/                # Custom React Hooks (WebSocket, Auth, ...)
│       ├── pages/
│       │   ├── BuyCrypto/        # Mua tiền mã hóa qua VNPay
│       │   ├── Home/             # Landing page giao diện TVN hiện đại
│       │   ├── Login/ Register/  # Trang Đăng nhập & Đăng ký
│       │   ├── Profile/          # Hồ sơ tài khoản & Quản lý Digital OTP 4 số
│       │   ├── Trade/            # Terminal Spot & Futures Trading
│       │   └── Wallet/           # Quản lý tài sản & Chuyển P2P
│       ├── stores/               # Zustand state stores
│       ├── types/                # TypeScript interface definitions
│       └── utils/                # Tiện ích định dạng tiền tệ, xuất Excel...
│
└── Trading/                      # Ứng dụng Backend (Spring Boot 3 + Java 21)
    ├── pom.xml
    ├── mvnw / mvnw.cmd
    └── src/
        └── main/
            ├── java/com/slayer/binacet/
            │   ├── config/       # Security, Kafka, WebSocket, VNPay Configs
            │   ├── controller/   # REST Controllers (Auth, Order, Wallet, User, Futures)
            │   ├── dto/          # Data Transfer Objects (Requests & Responses)
            │   ├── entity/       # JPA Entities (User, Order, Wallet, Position)
            │   ├── enums/        # Hệ thống Enums (Status, OrderType, Side)
            │   ├── exception/    # Global Exception Handler
            │   ├── repository/   # Spring Data JPA Repositories
            │   ├── service/      # Business logic & Trading execution engine
            │   └── util/         # JWT Helpers, SecurityUtils
            └── resources/
                └── application.properties # Cấu hình Database, Kafka, VNPay, JWT
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu Cầu Môi Trường
* **Java**: `JDK 21` trở lên
* **Node.js**: `v18.x` hoặc `v20.x` (kèm npm 9+)
* **MySQL**: Phiên bản `8.0+` (Cổng mặc định: `3307` hoặc `3306`)
* **Docker & Docker Desktop**: Dùng để chạy cụm **Apache Kafka** (cổng `9092`) và **Redis** (cổng `6379`)

---

### 2. Cài Đặt Cơ Sở Dữ Liệu (MySQL)
Tạo database mới trong MySQL:
```sql
CREATE DATABASE Binance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### 3. Khởi Chạy Redis & Apache Kafka Qua Docker (PowerShell)
Hệ thống sử dụng file `docker-compose.yml` được cấu hình sẵn với `name: trading`, tự động gom cả **Kafka** (chế độ KRaft không cần Zookeeper) và **Redis** vào chung một nhóm project duy nhất trên Docker Desktop.

Mở cửa sổ **PowerShell** trên Windows và thực hiện:

```powershell
# Di chuyển vào thư mục gốc dự án (nơi chứa file docker-compose.yml)
cd D:\project\Trading

# Khởi chạy cả Redis và Kafka chạy ngầm (-d) trong cùng nhóm project 'trading'
docker compose up -d

# Xem danh sách và trạng thái các container đang chạy
docker compose ps

# Kiểm tra kết nối Redis (phản hồi mong đợi: PONG)
docker exec trading_redis redis-cli ping

# Kiểm tra danh sách topics trên Kafka broker
docker exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
```

> **Gợi ý quản lý Docker**:
> - Xem log thời gian thực: `docker compose logs -f`
> - Khởi động lại dịch vụ: `docker compose restart`
> - Dừng các container: `docker compose down`

---

### 4. Khởi Chạy Backend (Spring Boot)
Di chuyển vào thư mục backend và chạy ứng dụng:

```bash
cd Trading/Trading

# Trên Windows
./mvnw.cmd clean spring-boot:run

# Trên Linux / macOS
./mvnw clean spring-boot:run
```

* API Backend: `http://localhost:8080`
* WebSocket: `http://localhost:8080/ws`

---

### 5. Khởi Chạy Frontend (React + Vite)
```bash
cd Trading/FrontEnd

# Cài đặt thư viện
npm install

# Khởi động dev server
npm run dev
```

* Ứng dụng web: `http://localhost:3000`

---

## 🧪 Tài Khoản Thử Nghiệm & Trải Nghiệm Tính Năng

1. **Đăng ký tài khoản mới**: Truy cập `/register` để tạo tài khoản.
2. **Thiết lập mã OTP chuyển tiền**:
   - Truy cập **Hồ sơ & Bảo mật (`/profile`)**.
   - Bấm **"Thiết Lập Mã OTP Ngay"** để tạo mã PIN 4 số.
3. **Nhận vốn trải nghiệm**: 
   - Truy cập trang **Ví tài sản (`/wallet`)**.
   - Bấm nút **"Nạp"** (Faucet) để nhận USDT, BTC trải nghiệm.
4. **Chuyển tiền P2P nội bộ**:
   - Bấm nút **"Chuyển P2P"** tại trang Ví.
   - Nhập UID người nhận (hệ thống tự động tra cứu tên sau 0.6s).
   - Nhập số tiền và xác thực bằng **Mã OTP 4 số**.
5. **Giao dịch Spot & Futures**:
   - Truy cập `/trade/BTCUSDT` để đặt lệnh Mua/Bán Spot hoặc Futures với đòn bẩy.

---

## 📋 Quy Chuẩn Phát Triển (Git Workflow)

* Tuân thủ quy tắc commit rõ ràng theo chuẩn Conventional Commits:
  * `feat(...)`: Phát triển tính năng mới.
  * `fix(...)`: Sửa lỗi phát sinh.
  * `refactor(...)`: Tối ưu cấu trúc mã nguồn.
  * `style(...)`: Điều chỉnh giao diện, CSS, khoảng cách.
  * `docs(...)`: Cập nhật tài liệu, README.

---

## 📄 Bản Quyền (License)

Dự án được xây dựng và phát triển phục vụ mục đích học tập, nghiên cứu và triển khai nền tảng giao dịch tài sản số thế hệ mới.

© 2026 **TVN.COM**. All Rights Reserved.
