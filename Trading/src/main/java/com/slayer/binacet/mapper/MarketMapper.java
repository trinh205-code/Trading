package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.response.BinanceTickerResponse;
import com.slayer.binacet.dto.response.MarketResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.stereotype.Component;

@Mapper(componentModel = "spring")
public interface MarketMapper {

    @Mapping(source = "lastPrice", target = "currentPrice")
    @Mapping(source = "priceChangePercent", target = "priceChange")
    @Mapping(source = "volume", target = "volume24h")
    MarketResponse toResponse(BinanceTickerResponse ticker);

}