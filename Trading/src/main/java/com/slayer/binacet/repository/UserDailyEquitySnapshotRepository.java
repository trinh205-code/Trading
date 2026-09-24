package com.slayer.binacet.repository;

import com.slayer.binacet.entity.UserDailyEquitySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserDailyEquitySnapshotRepository extends JpaRepository<UserDailyEquitySnapshot, Long> {

    List<UserDailyEquitySnapshot> findByUserIdAndSnapshotDateGreaterThanEqualOrderBySnapshotDateAsc(String userId, LocalDate snapshotDate);

    Optional<UserDailyEquitySnapshot> findByUserIdAndSnapshotDate(String userId, LocalDate snapshotDate);
}
