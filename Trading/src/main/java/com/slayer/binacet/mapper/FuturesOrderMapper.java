package com.slayer.binacet.mapper;

import com.slayer.binacet.Enums.FuturesOrderStatus;
import com.slayer.binacet.dto.request.CreateFuturesOrderRequest;
import com.slayer.binacet.dto.response.FuturesOrderResponse;
import com.slayer.binacet.entity.FuturesInstrument;
import com.slayer.binacet.entity.FuturesOrder;
import com.slayer.binacet.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;

@Mapper(componentModel = "spring")
public interface FuturesOrderMapper {

    @Mapping(source = "instrument.symbol", target = "symbol")
    FuturesOrderResponse toResponse(FuturesOrder order);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", source = "user")
    @Mapping(target = "instrument", source = "instrument")
    @Mapping(target = "price", source = "price")
    @Mapping(target = "totalQuantity", source = "request.quantity")
    @Mapping(target = "remainingQuantity", source = "request.quantity")
    @Mapping(target = "executedQuantity", expression = "java(java.math.BigDecimal.ZERO)")
    @Mapping(target = "cancelledQuantity", ignore = true)
    @Mapping(target = "takeProfitPrice", source = "request.takeProfit")
    @Mapping(target = "status", expression = "java(com.slayer.binacet.Enums.FuturesOrderStatus.OPEN)")
    @Mapping(target = "marginCurrencyShortName", source = "instrument.marginCurrencyShortName")
    @Mapping(target = "stage", expression = "java(request.isReduceOnly() ? \"exit\" : \"default\")")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "trades", ignore = true)
    @Mapping(target = "groupId", ignore = true)
    FuturesOrder toEntity(CreateFuturesOrderRequest request, User user, FuturesInstrument instrument, BigDecimal price);

    @Mapping(source = "quantity", target = "totalQuantity")
    @Mapping(source = "quantity", target = "remainingQuantity")
    @Mapping(source = "takeProfit", target = "takeProfitPrice")
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "instrument", ignore = true)
    FuturesOrder toEntity(CreateFuturesOrderRequest request);
}