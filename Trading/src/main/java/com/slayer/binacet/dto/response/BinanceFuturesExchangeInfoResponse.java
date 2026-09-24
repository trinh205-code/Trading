package com.slayer.binacet.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class BinanceFuturesExchangeInfoResponse {
    private List<BinanceFuturesSymbol> symbols;
}