package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.response.OrderResponse;
import com.slayer.binacet.entity.Order;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OrderMapper {

    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "market.symbol", target = "symbol")
    OrderResponse toResponse(Order order);

}
