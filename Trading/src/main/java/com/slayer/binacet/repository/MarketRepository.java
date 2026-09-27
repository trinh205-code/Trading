package com.slayer.binacet.repository;

import com.slayer.binacet.entity.Market;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarketRepository extends JpaRepository<Market, String> {
    List<Market> findByStatus(String status);

    // 1. Top nổi bật / Khối lượng giao dịch 24h lớn nhất (Highlights / Top Volume)
    List<Market> findByStatusOrderByQuoteVolume24hDesc(String status, Pageable pageable);

    // 2. Top tăng giá 24h (Gainers)
    List<Market> findByStatusOrderByPriceChangePercentDesc(String status, Pageable pageable);

    // 3. Top giảm giá 24h (Losers)
    List<Market> findByStatusOrderByPriceChangePercentAsc(String status, Pageable pageable);

    // 4. Vốn hóa thị trường lớn nhất (Market Cap)
    List<Market> findByStatusOrderByMarketCapDesc(String status, Pageable pageable);

    // 5. Giá trị đồng coin cao nhất (Highest Price)
    List<Market> findByStatusOrderByCurrentPriceDesc(String status, Pageable pageable);

    // 6. Mới niêm yết (New Listings / Alphabetical symbol)
    List<Market> findByStatusOrderBySymbolAsc(String status, Pageable pageable);
}
