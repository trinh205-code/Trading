package com.slayer.binacet.mapper;


import com.slayer.binacet.dto.request.CreateFuturesOrderRequest;
import com.slayer.binacet.dto.response.FuturesOrderResponse;
import com.slayer.binacet.entity.FuturesOrder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;


@Mapper(componentModel = "spring")
public interface FuturesOrderMapper {


    @Mapping(source = "instrument.symbol", target = "symbol")
    FuturesOrderResponse toResponse(FuturesOrder order);


    @Mapping(source = "quantity", target = "totalQuantity")
    @Mapping(source = "quantity", target = "remainingQuantity")
    @Mapping(source = "takeProfit", target = "takeProfitPrice")
    // Bỏ qua các trường phải được Service set thủ công (User, Instrument, Status...)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "instrument", ignore = true)
    FuturesOrder toEntity(CreateFuturesOrderRequest request);
}