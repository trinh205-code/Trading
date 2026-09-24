package com.slayer.binacet.repository;

import com.slayer.binacet.entity.FuturesInstrument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FuturesInstrumentRepository extends JpaRepository<FuturesInstrument, String> {
    List<FuturesInstrument> findByStatus(String status);
}
