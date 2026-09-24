package com.slayer.binacet.mapper;


import com.slayer.binacet.dto.response.FuturesWalletResponse;
import com.slayer.binacet.entity.FuturesWallet;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Mapper(componentModel = "spring")
public interface FuturesWalletMapper {

    @Mapping(
            target = "id",
            expression = "java(wallet.getId() != null ? wallet.getId().toString() : null)"
    )
    FuturesWalletResponse toResponse(FuturesWallet wallet);
}
