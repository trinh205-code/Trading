package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.response.FuturesInstrumentResponse;
import com.slayer.binacet.entity.FuturesInstrument;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;
import java.util.List;

@Mapper(componentModel = "spring")
public interface FuturesInstrumentResponseMapper {

    @Mapping(source = "maxLeverageLong", target = "maxLeverage")
    FuturesInstrumentResponse toResponse(FuturesInstrument futuresInstrument);

    @Mapping(source = "instrument.maxLeverageLong", target = "maxLeverage")
    @Mapping(source = "lastPrice", target = "lastPrice")
    @Mapping(source = "markPrice", target = "markPrice")
    FuturesInstrumentResponse toResponse(FuturesInstrument instrument, BigDecimal lastPrice, BigDecimal markPrice);

    List<FuturesInstrumentResponse> toResponseList(List<FuturesInstrument> instruments);
}
