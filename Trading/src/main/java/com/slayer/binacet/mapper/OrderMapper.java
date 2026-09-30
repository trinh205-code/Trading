package com.slayer.binacet.mapper;

import com.slayer.binacet.Enums.OrderStatus;
import com.slayer.binacet.Enums.OrderType;
import com.slayer.binacet.dto.request.CreateOrderRequest;
import com.slayer.binacet.dto.response.OrderResponse;
import com.slayer.binacet.entity.Market;
import com.slayer.binacet.entity.Order;
import com.slayer.binacet.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;
import java.util.List;

@Mapper(componentModel = "spring")
public interface OrderMapper {

    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "market.symbol", target = "symbol")
    OrderResponse toResponse(Order order);


    @Mapping(target = "id", ignore = true)
    @Mapping(target = "clientOrderId", source = "clientOrderId")
    @Mapping(target = "user", source = "user")
    @Mapping(target = "market", source = "market")
    @Mapping(target = "side", source = "request.side")
    @Mapping(target = "orderType", source = "orderType")
    @Mapping(target = "status", expression = "java(com.slayer.binacet.Enums.OrderStatus.NEW)")
    @Mapping(target = "pricePerUnit", source = "orderPrice")
    @Mapping(target = "totalQuantity", source = "request.quantity")
    @Mapping(target = "remainingQuantity", source = "request.quantity")
    @Mapping(target = "lockedAmount", source = "amountToLock")
    @Mapping(target = "avgPrice", ignore = true)
    @Mapping(target = "feeAmount", ignore = true)
    @Mapping(target = "trades", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Order toEntity(CreateOrderRequest request, User user, Market market, String clientOrderId, OrderType orderType, BigDecimal orderPrice, BigDecimal amountToLock);
}
