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
}
