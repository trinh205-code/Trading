package com.slayer.binacet.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception được ném ra khi có lỗi liên quan đến Refresh Token.
 * Ví dụ: Refresh Token đã hết hạn, không hợp lệ, hoặc không được tìm thấy trong cơ sở dữ liệu.
 * Bằng cách sử dụng @ResponseStatus(HttpStatus.FORBIDDEN), khi exception này được ném ra,
 * Spring Boot (nếu không có GlobalExceptionHandler can thiệp) sẽ tự động trả về mã lỗi 403.
 * Tuy nhiên, vì chúng ta đã có GlobalExceptionHandler, lỗi này sẽ được đóng gói lại thành ApiResponse.
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class TokenRefreshException extends RuntimeException {

    private static final long serialVersionUID = 1L;


    public TokenRefreshException(String token, String message) {
        super(String.format("Failed for [%s]: %s", token, message));
    }


    public TokenRefreshException(String message) {
        super(message);
    }
}
