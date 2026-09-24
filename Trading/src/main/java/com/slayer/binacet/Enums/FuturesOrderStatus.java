package com.slayer.binacet.Enums;

public enum FuturesOrderStatus {
    OPEN,                 // Lệnh đang chờ khớp (chưa khớp được tí nào)
    PARTIALLY_FILLED,     // Đã khớp được một phần, phần còn lại đang chờ
    FILLED,               // Đã khớp toàn bộ
    CANCELLED,            // Bị hủy hoàn toàn trước khi khớp
    PARTIALLY_CANCELLED,  // Bị hủy phần còn lại (sau khi đã khớp một phần)
    REJECTED,             // Bị hệ thống từ chối (ví dụ: số dư không đủ lúc trigger)
    UNTRIGGERED           // Lệnh điều kiện (Stop/Take profit) chưa chạm giá kích hoạt
}
