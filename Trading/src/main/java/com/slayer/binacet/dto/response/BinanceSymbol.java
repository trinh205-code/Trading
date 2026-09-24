package com.slayer.binacet.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class BinanceSymbol {
    private String symbol;
    private String status;
    private String baseAsset;
    private String quoteAsset;

    private List<Map<String, Object>> filters;
}