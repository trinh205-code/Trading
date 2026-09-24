package com.slayer.binacet.config;

import com.slayer.binacet.Enums.Role;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j // Dùng để in log ra màn hình console
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        String adminEmail = "admin@binacet.com";

        // Kiểm tra xem database đã có tài khoản admin này chưa
        if (userRepository.findByEmail(adminEmail).isEmpty()) {

            log.info("Chưa có tài khoản Admin. Hệ thống đang tự động tạo...");

            User admin = User.builder()
                    .email(adminEmail)
                    // BẮT BUỘC phải mã hóa mật khẩu, nếu không Spring Security sẽ không cho đăng nhập
                    .password(passwordEncoder.encode("Admin@123"))
                    .fullName("BinaceT Administrator")
                    .phoneNumber("0999999999")
                    .role(Role.ADMIN) // Đảm bảo bạn đã thêm biến Role vào Entity User như đã bàn trước đó

                    .build();

            userRepository.save(admin);

            log.info("Tạo tài khoản Admin thành công!");
            log.info("Email: {} | Password: {}", adminEmail, "Admin@123");
        }
    }
}