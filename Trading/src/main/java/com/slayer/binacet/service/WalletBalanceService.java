package com.slayer.binacet.service;

import com.slayer.binacet.dto.request.DepositRequest;
import com.slayer.binacet.dto.request.TransferRequest;
import com.slayer.binacet.dto.request.WithdrawRequest;
import com.slayer.binacet.dto.response.DepositResponse;
import com.slayer.binacet.dto.response.WalletResponse;

import java.math.BigDecimal;
import java.util.List;

public interface WalletBalanceService {
    List<WalletResponse> getMyWallets();

    

    DepositResponse deposit(DepositRequest request);

    WalletResponse withdraw(WithdrawRequest request);

    void transfer(TransferRequest request);

    void lockBalance(String userId, String currency, BigDecimal amount);

    void unlockBalance(String userId, String currency, BigDecimal amount);

    org.springframework.data.domain.Page<com.slayer.binacet.dto.response.FundingTransactionResponse> getFundingHistory(
            String asset, String type, java.time.Instant startDate, java.time.Instant endDate, org.springframework.data.domain.Pageable pageable);

    void recordFundingTransaction(String userId, String asset, String type, BigDecimal amount, BigDecimal balanceAfter, String note);
}
