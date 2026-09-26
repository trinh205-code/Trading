package com.slayer.binacet.repository;

import com.slayer.binacet.entity.UserHourlyEquitySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserHourlyEquitySnapshotRepository extends JpaRepository<UserHourlyEquitySnapshot, Long> {
    List<UserHourlyEquitySnapshot> findByUserIdAndSnapshotTimeGreaterThanEqualOrderBySnapshotTimeAsc(String userId, LocalDateTime snapshotTime);
    Optional<UserHourlyEquitySnapshot> findByUserIdAndSnapshotTime(String userId, LocalDateTime snapshotTime);
}
