package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.response.TradeResponse;
import com.slayer.binacet.entity.Trade;
import org.mapstruct.Mapper;
import org.springframework.stereotype.Component;

import com.slayer.binacet.dto.response.TradeResponse;
import com.slayer.binacet.entity.Trade;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TradeMapper {

    @Mapping(target = "orderId", expression = "java(trade.getOrder() != null ? trade.getOrder().getId().toString() : null)")
    @Mapping(target = "totalQuote", expression = "java(trade.getPrice().multiply(trade.getQuantity()))")
    @Mapping(target = "side", expression = "java(trade.getSide() != null ? trade.getSide().name() : null)")
    TradeResponse toResponse(Trade trade);

}
