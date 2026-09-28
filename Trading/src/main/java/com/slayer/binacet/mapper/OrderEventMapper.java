package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.event.OrderEvent;
import com.slayer.binacet.entity.FuturesOrder;
import com.slayer.binacet.entity.Order;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OrderEventMapper {

    @Mapping(target = "orderId", source = "order.id")
    @Mapping(target = "symbol", source = "order.instrument.symbol")
    @Mapping(target = "side", source = "order.side")
    @Mapping(target = "orderType", source = "order.orderType")
    @Mapping(target = "price", source = "order.price")
    @Mapping(target = "quantity", source = "order.totalQuantity")
    @Mapping(target = "remainingQuantity", source = "order.remainingQuantity")
    @Mapping(target = "timestamp", expression = "java(order.getCreatedAt() != null ? order.getCreatedAt() : java.time.Instant.now())")
    @Mapping(target = "action", source = "action")
    OrderEvent toFuturesOrderEvent(FuturesOrder order, String action);

    @Mapping(target = "orderId", source = "order.id")
    @Mapping(target = "symbol", source = "order.market.symbol")
    @Mapping(target = "side", source = "order.side")
    @Mapping(target = "orderType", ignore = true)
    @Mapping(target = "price", source = "order.pricePerUnit")
    @Mapping(target = "quantity", source = "order.totalQuantity")
    @Mapping(target = "remainingQuantity", source = "order.remainingQuantity")
    @Mapping(target = "timestamp", expression = "java(order.getCreatedAt() != null ? order.getCreatedAt() : java.time.Instant.now())")
    @Mapping(target = "action", source = "action")
    OrderEvent toSpotOrderEvent(Order order, String action);
}
