package com.slayer.binacet.controller;

import com.slayer.binacet.dto.request.TransferRequest;
import com.slayer.binacet.dto.request.TransferWalletRequest;
import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.WalletResponse;
import com.slayer.binacet.service.impl.WalletServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/wallet" )
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

    @PostMapping("/transfer")
    public ResponseEntity<Object> transferWallet(@Valid @RequestBody TransferRequest request) {
        walletServiceImpl.transfer(request);
        return ResponseEntity.ok(ApiResponse.success("Chuyển tiền thành công"));
    }

    @GetMapping("/user/{receiverId}")
    public ResponseEntity<Object> getReceiverInfo(@PathVariable String receiverId) {
        java.util.Map<String, String> info = walletServiceImpl.getReceiverInfo(receiverId);
        return ResponseEntity.ok(ApiResponse.success(info, "Tìm thấy thông tin người nhận"));
    }
}