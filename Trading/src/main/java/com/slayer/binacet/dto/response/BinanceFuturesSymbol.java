package com.slayer.binacet.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class BinanceFuturesSymbol {
    private String symbol;
    private String status;         // TRADING, PENDING_TRADING, DELIVERING...
    private String baseAsset;
    private String quoteAsset;
    private String marginAsset;
    private String contractType;
    private List<Map<String, String>> filters;
}
