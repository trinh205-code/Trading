package com.slayer.binacet.mapper;

import com.slayer.binacet.Enums.OrderSide;
import com.slayer.binacet.dto.request.ClosePartialPositionRequest;
import com.slayer.binacet.dto.request.CreateFuturesOrderRequest;
import com.slayer.binacet.dto.response.FuturesPositionHistoryResponse;
import com.slayer.binacet.dto.response.FuturesPositionResponse;
import com.slayer.binacet.entity.FuturesPosition;
import com.slayer.binacet.entity.FuturesTransaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;

@Mapper(componentModel = "spring")
public interface FuturesPositionMapper {

    @Mapping(source = "instrument.symbol", target = "symbol")
    @Mapping(target = "unrealizedPnl", ignore = true)
    FuturesPositionResponse toResponse(FuturesPosition position);

    @Mapping(target = "symbol", source = "position.instrument.symbol")
    @Mapping(target = "side", source = "side")
    @Mapping(target = "orderType", expression = "java(com.slayer.binacet.Enums.FuturesOrderType.MARKET)")
    @Mapping(target = "price", ignore = true)
    @Mapping(target = "stopPrice", ignore = true)
    @Mapping(target = "quantity", source = "quantity")
    @Mapping(target = "leverage", source = "position.leverage")
    @Mapping(target = "takeProfit", ignore = true)
    @Mapping(target = "stopLossPrice", ignore = true)
    @Mapping(target = "reduceOnly", constant = "true")
    CreateFuturesOrderRequest toCloseOrderRequest(FuturesPosition position, OrderSide side, BigDecimal quantity);

    @Mapping(target = "symbol", source = "position.instrument.symbol")
    @Mapping(target = "side", source = "side")
    @Mapping(target = "orderType", source = "request.orderType")
    @Mapping(target = "price", source = "request.price")
    @Mapping(target = "stopPrice", ignore = true)
    @Mapping(target = "quantity", source = "quantity")
    @Mapping(target = "leverage", source = "position.leverage")
    @Mapping(target = "takeProfit", ignore = true)
    @Mapping(target = "stopLossPrice", ignore = true)
    @Mapping(target = "reduceOnly", constant = "true")
    CreateFuturesOrderRequest toClosePartialOrderRequest(FuturesPosition position, ClosePartialPositionRequest request, OrderSide side, BigDecimal quantity);

    @Mapping(target = "id", source = "t.id")
    @Mapping(target = "symbol", source = "t.symbol")
    @Mapping(target = "stage", source = "t.stage")
    @Mapping(target = "realizedPnl", source = "t.amount")
    @Mapping(target = "feeAmount", source = "t.feeAmount")
    @Mapping(target = "leverage", expression = "java(t.getLeverage() != null ? t.getLeverage() : (t.getPosition() != null ? t.getPosition().getLeverage() : null))")
    @Mapping(target = "avgPrice", expression = "java(t.getEntryPrice() != null ? t.getEntryPrice().abs() : (t.getPosition() != null && t.getPosition().getAvgPrice() != null ? t.getPosition().getAvgPrice().abs() : null))")
    @Mapping(target = "source", source = "t.source")
    @Mapping(target = "parentType", source = "t.parentType")
    @Mapping(target = "parentId", source = "t.parentId")
    @Mapping(target = "createdAt", source = "t.createdAt")
    FuturesPositionHistoryResponse toHistoryResponse(FuturesTransaction t);
}
