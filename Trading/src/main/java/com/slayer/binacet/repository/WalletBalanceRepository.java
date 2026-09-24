package com.slayer.binacet.repository;

import com.slayer.binacet.entity.WalletBalance;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WalletBalanceRepository extends JpaRepository<WalletBalance, String> {
    List<WalletBalance> findByUserId(String userId);

    @Query("SELECT DISTINCT w.user.id FROM WalletBalance w")
    List<String> findDistinctUserIds();


//    gọi lệnh findByUserIdAndAssetName, Database sẽ "khóa" dòng dữ liệu của ví này lại
//            (Row-level lock). Mọi lệnh khớp khác diễn ra cùng lúc muốn
//    đụng vào ví này đều phải ngoan ngoãn đứng chờ
//    ở hàng đợi. Sau khi transaction kết thúc, khóa được nhả ra và lệnh tiếp theo mới được chạy.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    Optional<WalletBalance>  findByUserIdAndCurrency(String userId, String currency);

    /**
     * PESSIMISTIC_WRITE = SELECT ... FOR UPDATE.
     * Transaction thứ 2 gọi hàm này trên CÙNG userId+currency sẽ tự động BỊ CHẶN (block)
     * cho tới khi transaction thứ 1 commit/rollback — không còn tình trạng đọc bản cũ rồi ghi đè.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM WalletBalance w WHERE w.user.id = :userId AND w.currency = :currency")
    Optional<WalletBalance> findByUserIdAndCurrencyForUpdate(
            @Param("userId") String userId, @Param("currency") String currency);

}
