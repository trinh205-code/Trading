package com.slayer.binacet.dto.response;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderBookResponse {
    private String symbol;

    // Danh sách người chờ MUA (Bids) -
    private List<OrderEntry> bids;

    // Danh sách người chờ BÁN (Asks)
    private List<OrderEntry> asks;

    // Một class con lưu thông tin 1 dòng lệnh

}
