package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.response.WalletResponse;
import com.slayer.binacet.entity.WalletBalance;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface WalletMapper {
    WalletBalance toEntity(WalletResponse response);

    WalletResponse toResponse(WalletBalance walletBalance);

}
