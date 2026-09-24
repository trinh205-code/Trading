package com.slayer.binacet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
// @JsonInclude(JsonInclude.Include.NON_NULL) // Bỏ comment dòng này nếu bạn không muốn hiện trường 'data: null' hoặc 'errors: null'
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private String errorCode; // Dùng khi có lỗi (ví dụ: "USER_NOT_FOUND")
    private T data;

    // Dùng cho lỗi validation
    private Object errors;


    // 1. Phản hồi thành công CÓ dữ liệu
    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> success(T data) {
        return success(data, "Operation successful");
    }

    // 2. Phản hồi thành công KHÔNG CÓ dữ liệu (ví dụ: Delete)
    public static ApiResponse<Void> success(String message) {
        return ApiResponse.<Void>builder()
                .success(true)
                .message(message)
                .data(null)
                .build();
    }

    // 3. Phản hồi lỗi chung
    public static <T> ApiResponse<T> error(String message, String errorCode) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .errorCode(errorCode)
                .data(null)
                .build();
    }

    public static <T> ApiResponse<T> error(String message) {
        return error(message, "INTERNAL_SERVER_ERROR");
    }

    // 4. Phản hồi lỗi Validation
    public static <T> ApiResponse<T> validationError(Object errors) {
        return ApiResponse.<T>builder()
                .success(false)
                .message("Validation failed")
                .errorCode("VALIDATION_ERROR")
                .errors(errors)
                .data(null)
                .build();
    }
}