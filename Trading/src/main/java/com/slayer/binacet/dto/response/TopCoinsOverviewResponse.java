package com.slayer.binacet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopCoinsOverviewResponse {
    private List<TopCoinResponse> highlights;   // Crypto nổi bật
    private List<TopCoinResponse> gainers;      // Top tăng giá
    private List<TopCoinResponse> losers;       // Top giảm giá
    private List<TopCoinResponse> newListings;  // Mới niêm yết
    private List<TopCoinResponse> topMarketCap; // Vốn hóa lớn nhất
    private List<TopCoinResponse> topVolume;    // Giá trị cao nhất / Khối lượng 24h
}
