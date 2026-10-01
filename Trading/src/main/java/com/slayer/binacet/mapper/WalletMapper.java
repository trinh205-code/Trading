package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.response.WalletResponse;
import com.slayer.binacet.entity.User;
import com.slayer.binacet.entity.WalletBalance;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;
import java.util.List;

@Mapper(componentModel = "spring", imports = {BigDecimal.class})
public interface WalletMapper {
    @Mapping(target = "user", ignore = true)
    WalletBalance toEntity(WalletResponse response);

    WalletResponse toResponse(WalletBalance walletBalance);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", source = "user")
    @Mapping(target = "currency", source = "currency")
    @Mapping(target = "balance", constant = "0")
    @Mapping(target = "lockedBalance", constant = "0")
    WalletBalance toEntity(User user, String currency);
}

