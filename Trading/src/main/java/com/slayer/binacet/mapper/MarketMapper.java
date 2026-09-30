package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.response.BinanceTickerResponse;
import com.slayer.binacet.dto.response.MarketResponse;
import com.slayer.binacet.dto.response.TopCoinResponse;
import com.slayer.binacet.dto.response.TopCoinsOverviewResponse;
import com.slayer.binacet.entity.Market;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;
import java.util.List;

@Mapper(componentModel = "spring")
public interface MarketMapper {

    @Mapping(source = "lastPrice", target = "currentPrice")
    @Mapping(source = "priceChangePercent", target = "priceChange")
    @Mapping(source = "volume", target = "volume24h")
    MarketResponse toResponse(BinanceTickerResponse ticker);

    @Mapping(target = "symbol", source = "market.symbol")
    @Mapping(target = "currentPrice", source = "currentPrice")
    @Mapping(target = "priceChange", expression = "java(market.getPriceChangePercent() != null ? market.getPriceChangePercent() : java.math.BigDecimal.ZERO)")
    @Mapping(target = "highPrice", source = "market.high24h")
    @Mapping(target = "lowPrice", source = "market.low24h")
    @Mapping(target = "volume24h", source = "market.volume24h")
    @Mapping(target = "quoteVolume24h", source = "market.quoteVolume24h")
    @Mapping(target = "marketCap", source = "market.marketCap")
    MarketResponse toResponse(Market market, BigDecimal currentPrice);

    @Mapping(target = "symbol", source = "symbol")
    @Mapping(target = "currentPrice", source = "currentPrice")
    @Mapping(target = "priceChange", expression = "java(market.getPriceChangePercent() != null ? market.getPriceChangePercent() : java.math.BigDecimal.ZERO)")
    @Mapping(target = "highPrice", source = "high24h")
    @Mapping(target = "lowPrice", source = "low24h")
    @Mapping(target = "volume24h", source = "volume24h")
    @Mapping(target = "quoteVolume24h", source = "quoteVolume24h")
    @Mapping(target = "marketCap", source = "marketCap")
    MarketResponse toResponse(Market market);

    List<MarketResponse> toResponseList(List<Market> markets);

    TopCoinsOverviewResponse toOverviewResponse(
            List<TopCoinResponse> highlights,
            List<TopCoinResponse> gainers,
            List<TopCoinResponse> losers,
            List<TopCoinResponse> newListings,
            List<TopCoinResponse> topMarketCap,
            List<TopCoinResponse> topVolume);

    @Mapping(target = "symbol", source = "market.symbol")
    @Mapping(target = "pair", expression = "java(market.getPair() != null ? market.getPair() : market.getBaseCurrencyShortName() + \"/\" + market.getTargetCurrencyShortName())")
    @Mapping(target = "baseCurrency", source = "market.baseCurrencyShortName")
    @Mapping(target = "targetCurrency", source = "market.targetCurrencyShortName")
    @Mapping(target = "currentPrice", source = "currentPrice")
    @Mapping(target = "priceChange", source = "market.priceChange")
    @Mapping(target = "priceChangePercent", source = "market.priceChangePercent")
    @Mapping(target = "high24h", source = "market.high24h")
    @Mapping(target = "low24h", source = "market.low24h")
    @Mapping(target = "volume24h", source = "market.volume24h")
    @Mapping(target = "quoteVolume24h", source = "market.quoteVolume24h")
    @Mapping(target = "marketCap", source = "market.marketCap")
    TopCoinResponse toTopCoinResponse(Market market, BigDecimal currentPrice);
}