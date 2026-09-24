package com.slayer.binacet.repository;

import com.slayer.binacet.Enums.OrderStatus;
import com.slayer.binacet.Enums.OrderType;
import com.slayer.binacet.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, String> {

    Page<Order> findByUserId(String userId, Pageable pageable);
    Page<Order> findByUserIdAndMarket_Symbol(String userId, String symbol, Pageable pageable);

    List<Order> findByMarketSymbolAndStatusIn(String marketSymbol, Collection<OrderStatus> statuses);

    List<Order> findByMarketSymbolAndOrderTypeAndStatusIn(String marketSymbol, OrderType orderType, Collection<OrderStatus> statuses);

    List<Order> findByStatusIn(Collection<OrderStatus> statuses);
}
