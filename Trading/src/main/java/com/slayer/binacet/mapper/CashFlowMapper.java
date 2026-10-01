package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.response.CashFlowItemResponse;
import com.slayer.binacet.dto.response.CashFlowResponse;
import com.slayer.binacet.dto.response.CashFlowSummaryResponse;
import org.mapstruct.Mapper;

import java.math.BigDecimal;
import java.util.List;

@Mapper(componentModel = "spring")
public interface CashFlowMapper {

    CashFlowSummaryResponse toSummaryResponse(BigDecimal totalDeposit,
                                              BigDecimal totalWithdraw,
                                              BigDecimal totalTradingFee,
                                              BigDecimal totalRealizedPnl,
                                              BigDecimal totalTransferIn,
                                              BigDecimal totalTransferOut,
                                              BigDecimal netCashFlow);

    CashFlowResponse toResponse(CashFlowSummaryResponse summary, List<CashFlowItemResponse> items);
}
