# TVN Exchange - Nền Tảng Giao Dịch Tiền Mã Hoá Demo (Crypto Exchange)

<div align="center">

![TVN Exchange Banner](https://img.shields.io/badge/TVN-EXCHANGE-da251d?style=for-the-badge&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Kafka](https://img.shields.io/badge/Apache%20Kafka-231F20?style=for-the-badge&logo=apachekafka&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Hệ thống sàn giao dịch tiền mã hóa hiệu năng cao, hỗ trợ giao dịch Giao ngay (Spot), Hợp đồng tương lai (Futures), Chuyển tiền bảo mật bằng Digital OTP thời gian thực.**

</div>

---

##  TÀI LIỆU CHUYÊN SÂU TRONG THƯ MỤC `docs/`
-  **[docs/BACKEND_REQUIREMENTS.md](docs/BACKEND_REQUIREMENTS.md)**: Đặc tả chi tiết các yêu cầu chức năng & phi chức năng của hệ thống backend.
-  **[docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)**: Báo cáo cách thức hiện thực hóa (Matching Engine, Concurrency, Kafka, Digital OTP, Locking).
-  **[docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)**: Danh mục toàn bộ REST API, schema payload, mã lỗi và định dạng phản hồi.
-  **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Sơ đồ kiến trúc phân tầng, luồng xử lý Kafka, cơ chế quản trị rủi ro Futures và sơ đồ ERD.
-  **[docs/TESTING.md](docs/TESTING.md)**: Chiến lược kiểm thử tự động, danh mục test cases và hướng dẫn chạy test suite.
-  **[docs/TVN_Exchange_API.postman_collection.json](docs/TVN_Exchange_API.postman_collection.json)**: Bộ sưu tập Postman Collection sẵn sàng import và chạy test API.

---

## 1. Project Overview (Tổng Quan Dự Án)

**TVN Exchange** là nền tảng giao dịch tài sản số toàn diện được xây dựng theo chuẩn mực của các sàn giao dịch quốc tế hàng đầu (như Binance, OKX):
- **Đối tượng phục vụ**: Nhà đầu tư cá nhân và tổ chức có nhu cầu giao dịch tiền mã hóa giao ngay và phái sinh nhưng chưa có kinh nghiệm muốn tìm 1 nơi để học hỏi thử nghiệm.

---

## 2. Features (Các Chức Năng Chính)

###  2.1 Giao Dịch Giao Ngay (Spot Trading)
- Đầy đủ các loại lệnh: Lệnh Giới hạn (`LIMIT`) và Lệnh Thị trường (`MARKET`) cho hai chiều `BUY` và `SELL`.
- Sổ lệnh độ sâu thời gian thực (Order Book Depth) cập nhật tự động.
- Khớp lệnh tự động theo nguyên tắc ưu tiên Giá - Thời gian (Price-Time Priority).
- Hủy lệnh mở tức thì và tự động hoàn trả số dư đóng băng.

###  2.2 Giao Dịch Hợp Đồng Tương Lai (Futures Trading)
- Hợp đồng vĩnh cửu (Perpetual Futures) với chế độ ký quỹ riêng biệt (**Isolated Margin**).
- Tùy chỉnh đòn bẩy linh hoạt từ **1x** đến **125x**.
- Cơ chế **Reduce-Only** thông minh: Ngăn chặn đặt lệnh đóng vị thế trùng lặp gây đảo chiều rủi ro.
- Tự động tính toán liên tục: Giá thanh lý (`Liquidation Price`), Ký quỹ duy trì (`MMR`), PnL chưa chốt (`Unrealized PnL`) và PnL đã chốt (`Realized PnL`).

###  2.3 Chuyển Tiền P2P & Digital OTP 4 Số
- Chuyển tiền tức thời giữa 2 ví Spot (`WalletBalance`) bằng UID người nhận với phí 0 đồng.
- **Tự động nhận diện người nhận (Debounced Auto-check)**: Tra cứu và hiển thị họ tên người nhận sau 0.6s khi dán UID.
- **Digital OTP**: Xác thực giao dịch bằng mã PIN 4 chữ số lưu trên database, người dùng có thể tự tạo và đổi mã trong trang Hồ sơ & Bảo mật.
- Tự động chuyển hướng sang trang tạo mã OTP nếu người dùng chưa thiết lập mã khi bấm chuyển tiền.

###  2.4 Quản Lý Ví & Nạp Rút
- Tách biệt rõ ràng giữa **Ví Spot** và **Ví Futures**.
- Chuyển ví nội bộ Spot ⇄ Futures miễn phí, tức thời.
- Cổng nạp tiền **VNPay**: Nạp tiền VND quy đổi tự động sang USDT vào ví Spot.

###  2.5 Trung Tâm Lệnh & Xuất Báo Cáo Excel
- Xem toàn bộ lịch sử lệnh Spot, lệnh Futures, lịch sử khớp lệnh và lịch sử vị thế.
- Bộ lọc nâng cao theo cặp tiền, trạng thái và khoảng ngày tùy chỉnh (Từ ngày - Đến ngày).
- Xuất file báo cáo tài chính định dạng Excel (`.xlsx`) chuyên nghiệp.

---

## 3. Tech Stack (Công Nghệ Sử Dụng)

### Backend
| Công nghệ | Phiên bản | Vai trò |
| :--- | :--- | :--- |
| **Java** | `21` (LTS) | Ngôn ngữ lập trình chính hiệu năng cao |
| **Spring Boot** | `3.x` | Framework nền tảng xây dựng REST API & WebSocket |
| **Spring Security** | `6.x` | Bảo mật hệ thống, cấu hình CORS, phân quyền JWT |
| **Spring Data JPA** | `3.x` | Quản lý tầng truy xuất dữ liệu ORM với Hibernate |
| **Apache Kafka** | `4.0.x` | Hàng đợi sự kiện xử lý lệnh bất đồng bộ |
| **Redis** | `7-alpine` | Caching bảng giá thị trường 24h & quản lý phiên |
| **MySQL** | `8.0` | Hệ quản trị cơ sở dữ liệu quan hệ ACID |
| **VNPay SDK** | `2.1.0` | Cổng thanh toán trực tuyến |

### Frontend
| Công nghệ | Phiên bản | Vai trò |
| :--- | :--- | :--- |
| **React** | `19.2.x` | Thư viện UI xây dựng giao diện component-based |
| **TypeScript** | `5.x` | Ngôn ngữ kiểu tĩnh đảm bảo an toàn mã nguồn |
| **Vite** | `8.2.x` | Công cụ đóng gói và dev server hiệu năng cao |
| **Tailwind CSS** | `v4.3.x` | Khung styling utility-first hiện đại |
| **Lightweight Charts**| `5.2.x` | Thư viện biểu đồ nến TradingView thời gian thực |
| **Zustand** | `5.0.x` | Thư viện quản lý Global State gọn nhẹ |
| **Lucide React** | `1.31.x` | Bộ icon giao diện chuẩn quốc tế |

---

## 4. Architecture (Kiến Trúc Hệ Thống)

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

- Chi tiết kiến trúc tham khảo thêm tại: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## 5. Project Structure (Cấu Trúc Thư Mục)

```text
Trading/
├── docs/
│   ├── BACKEND_REQUIREMENTS.md       # Đặc tả chức năng & phi chức năng backend
│   ├── IMPLEMENTATION_SUMMARY.md     # Chi tiết giải pháp hiện thực hóa
│   ├── API_DOCUMENTATION.md          # Danh mục đầy đủ REST API
│   ├── ARCHITECTURE.md               # Kiến trúc, sơ đồ Mermaid, ERD
│   ├── TESTING.md                    # Hướng dẫn chạy và viết test
│   └── TVN_Exchange_API.postman_collection.json # Bộ Postman Collection
├── docker-compose.yml                # Docker Compose gom nhóm cả Kafka & Redis
│
├── frontend/                         # Mã nguồn ứng dụng Frontend
│   ├── src/
│   │   ├── api/                      # Axios client calls (userApi, walletApi, ...)
│   │   ├── components/               # UI Components (trading, wallet, common, layout)
│   │   ├── pages/                    # Route Pages (Trade, Wallet, Profile, BuyCrypto)
│   │   ├── stores/                   # Zustand stores (authStore, walletStore)
│   │   └── types/                    # TypeScript interfaces
│   └── package.json
│
└── Trading/                          # Mã nguồn ứng dụng Backend
    ├── src/
    │   ├── main/java/com/slayer/binacet/
    │   │   ├── config/               # Security, Kafka, WebSocket, VNPay Configs
    │   │   ├── controller/           # REST Controllers
    │   │   ├── dto/                  # Requests & Responses DTOs
    │   │   ├── entity/               # 20 JPA Entities
    │   │   ├── repository/           # Spring Data JPA Repositories
    │   │   ├── service/              # Interfaces & Implementations
    │   │   └── exception/            # GlobalExceptionHandler
    │   └── main/resources/
    │       ├── application.properties# Cấu hình kết nối MySQL, Kafka, Redis, JWT
    │       └── db/migration/V001_init.sql # Script SQL tạo toàn bộ 20 bảng
    └── pom.xml
```

---

## 6. Getting Started (Cách Khởi Chạy Project)

### Bước 1: Khởi động cụm Docker (Kafka & Redis)
Mở cửa sổ **PowerShell** và khởi chạy cụm Docker Compose:

```powershell
cd D:\project\Trading
docker compose up -d

# Kiểm tra cả kafka và trading_redis đang chạy trong nhóm 'trading'
docker compose ps
```

### Bước 2: Chuẩn bị cơ sở dữ liệu MySQL
Tạo database và nạp file migration [`V001_init.sql`](docs/../Trading/src/main/resources/db/migration/V001_init.sql):

```sql
CREATE DATABASE Binance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```powershell
# Thực thi script tạo toàn bộ bảng vào MySQL:
Get-Content "D:\project\Trading\Trading\src\main\resources\db\migration\V001_init.sql" -Raw | docker exec -i mysqldev mysql -uroot -proot123 Binance
```

### Bước 3: Khởi chạy Backend (Spring Boot)
Mở một cửa sổ dòng lệnh mới:

```powershell
cd D:\project\Trading\Trading
./mvnw.cmd clean spring-boot:run
```
* API Server sẵn sàng tại: `http://localhost:8080`
* WebSocket Endpoint: `http://localhost:8080/ws`

### Bước 4: Khởi chạy Frontend (React + Vite)
Mở một cửa sổ dòng lệnh mới:

```powershell
cd D:\project\Trading\frontend
npm install
npm run dev
```
* Mở trình duyệt tại: `http://localhost:3000`

---

## 7. Configuration (Cấu Hình Môi Trường)

Các cấu hình quan trọng trong file `Trading/src/main/resources/application.properties`:

| Khóa Cấu Hình | Giá Trị Mặc Định | Mô Tả |
| :--- | :--- | :--- |
| `spring.datasource.url` | `jdbc:mysql://localhost:3307/Binance` | Đường dẫn kết nối MySQL |
| `spring.datasource.username` | `root` | Tài khoản MySQL |
| `spring.datasource.password` | `root123` | Mật khẩu MySQL |
| `spring.kafka.bootstrap-servers` | `localhost:9092` | Cổng kết nối Kafka Broker |
| `spring.data.redis.host` | `localhost` | Địa chỉ máy chủ Redis |
| `spring.data.redis.port` | `6379` | Cổng Redis |
| `jwt.expiration` | `86400000` (24h) | Thời gian sống Access Token |
| `jwt.expirationRefreshToken` | `604800000` (7d) | Thời gian sống Refresh Token |

---

## 8. API Documentation (Tài Liệu API & Postman)

- Toàn bộ đặc tả các endpoint, payload request và response mẫu được lưu trữ tại:
  👉 **[docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)**
- Bộ sưu tập Postman Collection đầy đủ 7 thư mục chức năng:
  👉 **[docs/TVN_Exchange_API.postman_collection.json](docs/TVN_Exchange_API.postman_collection.json)**
  *(Hỗ trợ sẵn Test Script tự động trích xuất Bearer Token sau khi đăng nhập và gán vào biến `{{token}}` cho các request tiếp theo)*.

---

## 9. Testing (Kiểm Thử Hệ Thống)

Chi tiết chiến lược và kịch bản test tại: **[docs/TESTING.md](docs/TESTING.md)**.

```powershell
# Chạy toàn bộ 105 unit & integration tests của Backend:
cd D:\project\Trading\Trading
mvn test

# Chạy riêng bộ test kiểm thử luồng Chuyển tiền P2P & Mã Digital OTP:
mvn test -Dtest=WalletServiceImplTest
```

---

## 10. Roadmap (Lộ Trình Phát Triển)

###  Đã hoàn thành:
- [x] Đăng ký, đăng nhập, JWT Stateless Authentication, Refresh Token, Blacklist Logout.
- [x] Hồ sơ & Bảo mật: Đổi mật khẩu, thiết lập và đổi mã Digital OTP.
- [x] Quản lý ví Spot: Faucet coin thử nghiệm, phân tách số dư khả dụng và số dư khóa.
- [x] Chuyển tiền P2P nội bộ: Tra cứu UID người nhận tự động, xác thực mã OTP, khóa chống Double-Spending.
- [x] Giao dịch Spot: Đặt lệnh Limit/Market, sổ lệnh độ sâu OrderBook, khớp lệnh Kafka, hủy lệnh hoàn tiền.
- [x] Giao dịch Futures: Đòn bẩy 1x-125x, Isolated Margin, Reduce-Only, tính toán PnL và giá thanh lý.
- [x] Chuyển ví nội bộ Spot ⇄ Futures tức thời.
- [x] Cổng nạp tiền VNPay Sandbox (VND sang USDT).
- [x] Trung tâm lệnh: Lọc theo khoảng ngày tùy chỉnh, xuất báo cáo đối soát file Excel `.xlsx`.


###  Kế hoạch phát triển tiếp theo (Next Milestones):
- [ ] Tích hợp nạp/rút On-chain qua mạng lưới Blockchain thực tế (ERC-20, TRC-20, BEP-20).
- [ ] Giao dịch P2P Fiat có ký quỹ Escrow giữa người mua và người bán.
- [ ] Tích hợp tính năng Copy Trading và Bot lưới (Grid Trading Bot).
- [ ] Ứng dụng di động (Mobile App React Native / Flutter).
- [ ] Thêm tính năng cho vay tài sản crypto (Lending) và Gửi tài sản để nhận lợi suất
---

##  Bản Quyền (License)

Dự án được xây dựng và phát triển phục vụ mục đích học tập, nghiên cứu và triển khai nền tảng giao dịch tài sản số thế hệ mới.

© 2026 **TVN.COM**. All Rights Reserved.
