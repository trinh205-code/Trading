package com.slayer.binacet.controller;

import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.WalletResponse;
import com.slayer.binacet.service.impl.WalletServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}