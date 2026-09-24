package com.slayer.binacet.controller;

import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.FundingTransactionResponse;
import com.slayer.binacet.dto.response.WalletResponse;
import com.slayer.binacet.service.impl.WalletServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/wallet", "/api/v1/wallets"})
@RequiredArgsConstructor
public class WalletController {

    private final WalletServiceImpl walletServiceImpl;

    @PostMapping("/faucet")
    public ResponseEntity<WalletResponse> claimTestFunds() {
        WalletResponse response = walletServiceImpl.claimTestFunds();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<Object> getMyWallet() {
        List<WalletResponse> responses = walletServiceImpl.getMyWallets();
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/funding-history")
    public ResponseEntity<Object> getFundingHistory(
            @RequestParam(required = false) String asset,
            @RequestParam(required = false) String type,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<FundingTransactionResponse> result = walletServiceImpl.getFundingHistory(asset, type, startDate, endDate, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}