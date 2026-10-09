# 🧪 TESTING.md - TÀI LIỆU CHIẾN LƯỢC & HƯỚNG DẪN KIỂM THỬ
> **Dự án**: TVN Exchange  
> **Phiên bản**: v2.5.0  

---

## 📑 MỤC LỤC
1. [Chiến Lược Kiểm Thử (Testing Strategy)](#1-chiến-lược-kiểm-thử)
2. [Cấu Trúc Thư Mục Kiểm Thử](#2-cấu-trúc-thư-mục-kiểm-thử)
3. [Hướng Dẫn Chạy Test](#3-hướng-dẫn-chạy-test)
4. [Danh Sách Kịch Bản Kiểm Thử Trọng Tâm](#4-danh-sách-kịch-bản-kiểm-thử-trọng-tâm)
5. [Quy Chuẩn Viết Test Mới](#5-quy-chuẩn-viết-test-mới)

---

## 1. CHIẾN LƯỢC KIỂM THỬ

Hệ thống TVN Exchange áp dụng mô hình kiểm thử tự động đa tầng:
- **Unit Testing (Kiểm thử đơn vị)**:
  - Framework: **JUnit 5 (Jupiter)** kết hợp **Mockito**.
  - Kiểm thử độc lập logic tại tầng Service: tính toán số dư, xác thực OTP, logic khớp lệnh, kiểm tra điều kiện Reduce-Only.
  - Sử dụng `@Mock` cho các Repository và `@InjectMocks` cho Service Implementation để đảm bảo test chạy độc lập, tốc độ mili-giây.
- **Integration Testing (Kiểm thử tích hợp)**:
  - Kiểm thử chuỗi xử lý API qua `@SpringBootTest` và `MockMvc`.
  - Kiểm thử truy vấn database và Transaction rollback.
- **Frontend Verification**:
  - TypeScript strict type checking qua `tsc`.
  - Build verification qua `npm run build`.

---

## 2. CẤU TRÚC THƯ MỤC KIỂM THỬ

```text
Trading/src/test/java/com/slayer/binacet/
├── service/
│   └── impl/
│       ├── WalletServiceImplTest.java      # 19 tests ví, nạp/rút, P2P, Digital OTP
│       ├── OrderServiceImplTest.java       # Kiểm thử đặt lệnh Spot, khóa số dư
│       ├── FuturesOrderServiceImplTest.java# Kiểm thử đặt lệnh Futures, ký quỹ
│       └── UserServiceImplTest.java        # Kiểm thử đổi mật khẩu, tạo/đổi mã OTP
└── controller/
    └── WalletControllerTest.java           # Kiểm thử REST API endpoints ví
```

---

## 3. HƯỚNG DẪN CHẠY TEST

### 3.1 Chạy toàn bộ Test Suite Backend
Di chuyển vào thư mục backend `Trading/Trading`:

```powershell
# Chạy toàn bộ 105 tests
./mvnw.cmd test

# Hoặc bằng Maven cài sẵn trên máy
mvn test
```

### 3.2 Chạy riêng một Test Class cụ thể
Ví dụ kiểm thử luồng chuyển tiền P2P và xác thực OTP:

```powershell
mvn test -Dtest=WalletServiceImplTest
```

### 3.3 Chạy một phương thức Test đơn lẻ
```powershell
mvn test -Dtest=WalletServiceImplTest#testTransfer_Success
```

### 3.4 Kiểm tra biên dịch Frontend
Di chuyển vào thư mục `frontend`:

```powershell
npm run build
```

---

## 4. DANH SÁCH KỊCH BẢN KIỂM THỬ TRỌNG TÂM

### 4.1 Luồng Ví & Chuyển Tiền P2P (`WalletServiceImplTest`)
| STT | Tên Phương Thức Test | Kịch Bản Kiểm Thử | Kết Quả Kỳ Vọng |
| :---: | :--- | :--- | :--- |
| 1 | `testTransfer_Success` | Người gửi nhập đúng mã OTP 4 số, số dư đủ, người nhận hợp lệ | Chuyển tiền thành công, trừ ví người gửi, cộng ví người nhận |
| 2 | `testTransfer_NoOtpSet` | Người gửi chưa từng thiết lập mã OTP trong hệ thống | Bắn ngoại lệ `BusinessException`: "Bạn chưa thiết lập mã OTP chuyển tiền" |
| 3 | `testTransfer_InvalidOtp` | Người gửi nhập mã OTP không khớp với mã trong database | Bắn ngoại lệ `BusinessException`: "Mã OTP không chính xác" |
| 4 | `testTransfer_SelfTransfer` | Người gửi nhập `receiverId` trùng với ID của chính mình | Bắn ngoại lệ: Không cho phép tự chuyển cho chính mình |
| 5 | `testTransfer_InsufficientBalance` | Số tiền chuyển lớn hơn số dư khả dụng (`balance`) của ví | Bắn ngoại lệ: "Số dư không đủ" |
| 6 | `testTransfer_ReceiverNoWallet` | Người nhận chưa có ví cho loại coin đang chuyển (vd: ETH) | Hệ thống tự động tạo mới ví ETH cho người nhận và cộng tiền |

### 4.2 Luồng Đặt Lệnh Spot & Khóa Số Dư
- Đặt lệnh BUY LIMIT thành công khi số dư USDT đủ.
- Từ chối đặt lệnh BUY khi số dư USDT không đủ phí hoặc giá trị lệnh.
- Hủy lệnh OPEN thành công, hoàn trả chính xác số dư đã khóa.

---

## 5. QUY CHUẨN VIẾT TEST MỚI

1. **Đặt tên phương thức test**: Tuân thủ mẫu `should[ExpectedBehavior]_when[StateUnderTest]` hoặc `test[Feature]_[Condition]`.
2. **Cấu trúc 3 bước Arrange - Act - Assert (AAA)**:
   ```java
   @Test
   void testTransfer_Success() {
       // 1. Arrange (Chuẩn bị dữ liệu giả lập Mockito)
       when(userRepository.findById("sender-1")).thenReturn(Optional.of(sender));
       when(walletBalanceRepository.findByUserIdAndCurrencyWithLock(...)).thenReturn(...);

       // 2. Act (Thực thi phương thức nghiệp vụ)
       walletService.transfer(request);

       // 3. Assert (Kiểm tra kết quả và xác nhận số lần gọi mock)
       assertEquals(new BigDecimal("900"), senderWallet.getBalance());
       assertEquals(new BigDecimal("100"), receiverWallet.getBalance());
       verify(walletBalanceRepository, times(2)).save(any());
   }
   ```
3. **Độc lập dữ liệu**: Không phụ thuộc vào database thật, mock 100% các phụ thuộc bên ngoài khi viết Unit Test.
