package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.response.FuturesPositionResponse;
import com.slayer.binacet.entity.FuturesPosition;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FuturesPositionMapper {

    @Mapping(source = "instrument.symbol", target = "symbol")
    @Mapping(target = "unrealizedPnl", ignore = true)
    FuturesPositionResponse toResponse(FuturesPosition position);

}
