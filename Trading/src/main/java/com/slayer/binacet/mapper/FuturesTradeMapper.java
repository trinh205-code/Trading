package com.slayer.binacet.mapper;

import com.slayer.binacet.dto.response.FuturesTradeResponse;
import com.slayer.binacet.entity.FuturesTrade;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface FuturesTradeMapper {

    // Trỏ vào thuộc tính id của đối tượng order bên trong FuturesTrade
    @Mapping(source = "order.id", target = "orderId")
    FuturesTradeResponse toResponse(FuturesTrade trade);

    // Hỗ trợ map một danh sách (dùng khi phân trang)
    List<FuturesTradeResponse> toResponseList(List<FuturesTrade> trades);
}
