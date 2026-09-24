package com.slayer.binacet.repository;

import com.slayer.binacet.entity.Market;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarketRepository extends JpaRepository<Market, String> {
    List<Market> findByStatus(String status);
}
