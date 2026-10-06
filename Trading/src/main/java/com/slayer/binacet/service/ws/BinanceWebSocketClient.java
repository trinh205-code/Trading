package com.slayer.binacet.service.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.slayer.binacet.cache.MarketPriceCache;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import jakarta.websocket.ContainerProvider;
import jakarta.websocket.WebSocketContainer;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
@Slf4j
public class BinanceWebSocketClient extends TextWebSocketHandler {

    private final MarketPriceCache marketPriceCache;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private volatile WebSocketSession currentSession;
    private final AtomicBoolean reconnecting = new AtomicBoolean(false);

    // Stream tổng hợp: Tự động nhận giá của TOÀN BỘ cặp Futures (BTC, ETH, SOL, BNB,...)
    private static final String ALL_MARKET_STREAM_URL =
            "wss://stream.binance.com:9443/ws/!miniTicker@arr";

    @PostConstruct
    public void connectToBinance() {
        doConnect();
    }

    private void doConnect() {
        try {
            // Khởi tạo container với buffer lớn (10MB) để tránh lỗi Tomcat đóng kết nối do mảng All-Market quá lớn (>8KB)
            WebSocketContainer container = ContainerProvider.getWebSocketContainer();
            container.setDefaultMaxTextMessageBufferSize(10 * 1024 * 1024);
            container.setDefaultMaxBinaryMessageBufferSize(10 * 1024 * 1024);
            StandardWebSocketClient client = new StandardWebSocketClient(container);


            // Bắt buộc xử lý CompletableFuture để không bị nuốt lỗi Handshake
            client.execute(this, ALL_MARKET_STREAM_URL).whenComplete((session, throwable) -> {
                if (throwable != null) {
                    log.error("Kết nối WebSocket thất bại ở bước Handshake: {}", throwable.getMessage(), throwable);
                    scheduleReconnect();
                } else {
                    this.currentSession = session;
                    reconnecting.set(false);
                    log.info("KẾT NỐI WEBSOCKET BINANCE THÀNH CÔNG! Session ID: {}", session.getId());
                }
            });
        } catch (Exception e) {
            log.error("Lỗi ngoại lệ khi gọi connect: ", e);
            scheduleReconnect();
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        this.currentSession = session;
        reconnecting.set(false);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error(" Lỗi truyền tải WebSocket: ", exception);
        scheduleReconnect();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.warn(" WebSocket bị đóng: Code={}, Reason={}", status.getCode(), status.getReason());
        scheduleReconnect();
    }

    private void scheduleReconnect() {
        if (reconnecting.compareAndSet(false, true)) {
            log.warn(" Sẽ thử kết nối lại WebSocket sau 10 giây...");
        }
    }

    @Scheduled(fixedDelay = 10000)
    public void reconnectIfNeeded() {
        if (reconnecting.get()) {
            log.info("Đang thử kết nối lại Binance WebSocket...");
            doConnect();
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            JsonNode rootNode = objectMapper.readTree(message.getPayload());
            JsonNode dataNode = rootNode.has("data") ? rootNode.get("data") : rootNode;

            // Dữ liệu All-Market trả về dưới dạng JSON Array
            if (dataNode.isArray()) {
                for (JsonNode item : dataNode) {
                    processTick(item);
                }
            } else {
                processTick(dataNode);
            }
        } catch (Exception e) {
            log.error("Lỗi parse tin nhắn Binance WebSocket: {}", e.getMessage());
        }
    }

    private void processTick(JsonNode node) {
        if (!node.has("s")) return;

        String symbol = node.get("s").asText().toUpperCase();

        // Xử lý miniTicker từ Spot (stream !miniTicker@arr)
        if (node.has("c")) {
            BigDecimal price = new BigDecimal(node.get("c").asText());
            marketPriceCache.updateLastPrice(symbol, price);
            marketPriceCache.updateMarkPrice(symbol, price); // Cập nhật luôn cho Mark Price
        }

        // Giữ lại xử lý cho markPriceUpdate nếu có
        if (node.has("e") && "markPriceUpdate".equals(node.get("e").asText()) && node.has("p")) {
            marketPriceCache.updateMarkPrice(symbol, new BigDecimal(node.get("p").asText()));
        }
    }
}