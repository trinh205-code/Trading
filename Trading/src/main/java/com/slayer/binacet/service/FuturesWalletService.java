package com.slayer.binacet.service;

import com.slayer.binacet.dto.request.TransferWalletRequest;
import com.slayer.binacet.dto.response.FuturesWalletResponse;
import com.slayer.binacet.entity.FuturesWallet;

import java.math.BigDecimal;
import java.util.List;

public interface FuturesWalletService {
    List<FuturesWalletResponse> getMyFuturesWallet();

    FuturesWalletResponse transferToFutures(String currency, BigDecimal amount);
    FuturesWalletResponse transferToSpot( String currency, BigDecimal amount);
    FuturesWallet getOrCreateWallet( String currency);
    void applyRealizedPnl(String userId,String currency, BigDecimal pnl);
    void deductFee(String userId ,String currency, BigDecimal fee);
    void releaseMargin(String userId, String currency, BigDecimal amount);
    void lockMargin(String userId, String currency, BigDecimal amount);

}
