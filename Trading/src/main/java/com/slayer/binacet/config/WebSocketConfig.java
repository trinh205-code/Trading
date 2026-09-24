package com.slayer.binacet.config;

import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Frontend sẽ kết nối vào địa chỉ: ws://localhost:8080/ws
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Cho phép gọi chéo domain (CORS)
                .withSockJS(); // Cơ chế dự phòng nếu trình duyệt cũ không hỗ trợ WebSocket
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // /topic: Dùng để gửi tin nhắn Public (VD: Biểu đồ giá, Order Book chung)
        // /queue: Dùng để gửi tin nhắn Private (VD: Lệnh khớp của riêng 1 User)
        registry.enableSimpleBroker("/topic", "/queue");

        registry.setApplicationDestinationPrefixes("/app");
    }

}
