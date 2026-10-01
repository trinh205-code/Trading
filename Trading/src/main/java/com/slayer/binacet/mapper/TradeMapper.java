package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.response.TradeResponse;
import com.slayer.binacet.entity.Order;
import com.slayer.binacet.entity.Trade;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;
import java.time.Instant;

@Mapper(componentModel = "spring", imports = {Instant.class})
public interface TradeMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "order", source = "order")
    @Mapping(target = "symbol", source = "order.market.symbol")
    @Mapping(target = "side", source = "order.side")
    @Mapping(target = "price", source = "price")
    @Mapping(target = "quantity", source = "quantity")
    @Mapping(target = "feeAmount", ignore = true)
    @Mapping(target = "executionVenue", ignore = true)
    @Mapping(target = "timestamp", expression = "java(Instant.now())")
    Trade toEntity(Order order, BigDecimal price, BigDecimal quantity);

    @Mapping(target = "orderId", expression = "java(trade.getOrder() != null ? trade.getOrder().getId().toString() : null)")
    @Mapping(target = "totalQuote", expression = "java(trade.getPrice().multiply(trade.getQuantity()))")
    @Mapping(target = "side", expression = "java(trade.getSide() != null ? trade.getSide().name() : null)")
    TradeResponse toResponse(Trade trade);

}

