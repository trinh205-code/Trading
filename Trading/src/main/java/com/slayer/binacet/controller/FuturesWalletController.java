package com.slayer.binacet.controller;

import com.slayer.binacet.dto.request.WalletTransferRequest;
import com.slayer.binacet.dto.response.ApiResponse;
import com.slayer.binacet.dto.response.FuturesWalletResponse;
import com.slayer.binacet.service.impl.FuturesWalletServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/futures/wallet")
@RequiredArgsConstructor
@Slf4j
public class FuturesWalletController {

    private final FuturesWalletServiceImpl futuresWalletService;



    @GetMapping
    public ResponseEntity<ApiResponse<List<FuturesWalletResponse>>> getMyFuturesWallets() {
        List<FuturesWalletResponse> response = futuresWalletService.getMyFuturesWallet();
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy thông tin ví Futures thành công"));
    }


    @PostMapping("/transfer-in")
    public ResponseEntity<ApiResponse<FuturesWalletResponse>> transferSpotToFutures(
            @Valid @RequestBody WalletTransferRequest request) {

        log.info("User {} nạp {} {} từ Spot vào Futures",  request.getAmount(), request.getCurrency());

        FuturesWalletResponse response = futuresWalletService.transferToFutures(

                request.getCurrency().toUpperCase(),
                request.getAmount()
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Chuyển tiền vào ví Futures thành công"));
    }


    @PostMapping("/transfer-out")
    public ResponseEntity<ApiResponse<FuturesWalletResponse>> transferFuturesToSpot(
            @Valid @RequestBody WalletTransferRequest request) {

        log.info("User {} rút {} {} từ Futures về Spot",  request.getAmount(), request.getCurrency());

        FuturesWalletResponse response = futuresWalletService.transferToSpot(

                request.getCurrency().toUpperCase(),
                request.getAmount()
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Rút tiền về ví Spot thành công"));
    }



}