-- =============================================================================
-- TVN Exchange Database Initialization Script
-- File: V001_init.sql
-- Description: Create all core tables, constraints, indexes, and initial data
-- Target RDBMS: MySQL 8.0+
-- Character Set: utf8mb4 / utf8mb4_unicode_ci
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Table: user
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user` (
    `id` VARCHAR(36) NOT NULL,
    `full_name` VARCHAR(255) NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(50) NULL,
    `password` VARCHAR(255) NULL,
    `transfer_pin` VARCHAR(100) NULL COMMENT 'Mã Digital OTP 4 số',
    `auth_provider` VARCHAR(50) NULL,
    `provider_id` VARCHAR(255) NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'USER',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: wallet_balances (Spot Wallets)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wallet_balances` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `currency` VARCHAR(20) NOT NULL,
    `balance` DECIMAL(38, 8) NOT NULL DEFAULT 0.00000000,
    `locked_balance` DECIMAL(38, 8) NOT NULL DEFAULT 0.00000000,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_wallet_user_currency` (`user_id`, `currency`),
    KEY `idx_wallet_user_id` (`user_id`),
    CONSTRAINT `fk_wallet_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table: markets (Spot Markets)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `markets` (
    `symbol` VARCHAR(32) NOT NULL,
    `pair` VARCHAR(32) NULL,
    `base_currency_short_name` VARCHAR(16) NULL,
    `target_currency_short_name` VARCHAR(16) NULL,
    `status` VARCHAR(32) NULL DEFAULT 'ACTIVE',
    `min_quantity` DECIMAL(24, 8) NULL,
    `max_quantity` DECIMAL(24, 8) NULL,
    `min_price` DECIMAL(24, 8) NULL,
    `max_price` DECIMAL(24, 8) NULL,
    `min_notional` DECIMAL(24, 8) NULL,
    `current_price` DECIMAL(36, 18) NULL,
    `price_change` DECIMAL(36, 18) NULL,
    `price_change_percent` DECIMAL(18, 4) NULL,
    `high24h` DECIMAL(36, 18) NULL,
    `low24h` DECIMAL(36, 18) NULL,
    `volume24h` DECIMAL(36, 18) NULL,
    `quote_volume24h` DECIMAL(36, 18) NULL,
    `market_cap` DECIMAL(36, 8) NULL,
    PRIMARY KEY (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table: orders (Spot Orders)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
    `id` VARCHAR(36) NOT NULL,
    `client_order_id` VARCHAR(100) NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `market` VARCHAR(32) NOT NULL,
    `side` VARCHAR(16) NOT NULL,
    `order_type` VARCHAR(32) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `total_quantity` DECIMAL(24, 8) NOT NULL,
    `remaining_quantity` DECIMAL(24, 8) NOT NULL,
    `price_per_unit` DECIMAL(24, 8) NULL,
    `avg_price` DECIMAL(24, 8) NULL,
    `fee_amount` DECIMAL(24, 8) DEFAULT 0.00000000,
    `locked_amount` DECIMAL(24, 8) DEFAULT 0.00000000,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_client_order_id` (`client_order_id`),
    KEY `idx_orders_user_id` (`user_id`),
    KEY `idx_orders_market` (`market`),
    KEY `idx_orders_status` (`status`),
    CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_orders_market` FOREIGN KEY (`market`) REFERENCES `markets` (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table: trades (Spot Executed Trades)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `trades` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` VARCHAR(36) NOT NULL,
    `symbol` VARCHAR(32) NOT NULL,
    `side` VARCHAR(16) NOT NULL,
    `price` DECIMAL(24, 8) NOT NULL,
    `quantity` DECIMAL(24, 8) NOT NULL,
    `fee_amount` DECIMAL(24, 8) DEFAULT 0.00000000,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `execution_venue` VARCHAR(50) DEFAULT 'INTERNAL',
    PRIMARY KEY (`id`),
    KEY `idx_trades_order_id` (`order_id`),
    KEY `idx_trades_symbol` (`symbol`),
    CONSTRAINT `fk_trades_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Table: futures_instruments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `futures_instruments` (
    `symbol` VARCHAR(32) NOT NULL,
    `base_asset` VARCHAR(16) NULL,
    `quote_asset` VARCHAR(16) NULL,
    `margin_currency_short_name` VARCHAR(16) DEFAULT 'USDT',
    `kind` VARCHAR(32) DEFAULT 'perpetual',
    `maintenance_margin_rate` DECIMAL(10, 6) DEFAULT 0.005000,
    `last_price` DECIMAL(36, 18) NULL,
    `mark_price` DECIMAL(36, 18) NULL,
    `max_leverage_long` DECIMAL(10, 2) DEFAULT 125.00,
    `max_leverage_short` DECIMAL(10, 2) DEFAULT 125.00,
    `price_increment` DECIMAL(36, 18) DEFAULT 0.100000000000000000,
    `quantity_increment` DECIMAL(36, 18) DEFAULT 0.001000000000000000,
    `min_price` DECIMAL(36, 18) NULL,
    `max_price` DECIMAL(36, 18) NULL,
    `min_notional` DECIMAL(36, 18) DEFAULT 5.000000000000000000,
    `maker_fee` DECIMAL(10, 6) DEFAULT 0.000200,
    `taker_fee` DECIMAL(10, 6) DEFAULT 0.000500,
    `funding_frequency` INT DEFAULT 8,
    `status` VARCHAR(16) DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table: futures_wallets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `futures_wallets` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `currency_short_name` VARCHAR(10) NOT NULL,
    `balance` DECIMAL(36, 18) NOT NULL DEFAULT 0.000000000000000000,
    `locked_balance` DECIMAL(36, 18) NOT NULL DEFAULT 0.000000000000000000,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_futures_wallets_user_id` (`user_id`),
    CONSTRAINT `fk_futures_wallets_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Table: futures_positions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `futures_positions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `symbol` VARCHAR(32) NOT NULL,
    `active_pos` DECIMAL(36, 18) DEFAULT 0.000000000000000000,
    `avg_price` DECIMAL(36, 18) DEFAULT 0.000000000000000000,
    `liquidation_price` DECIMAL(36, 18) DEFAULT 0.000000000000000000,
    `locked_margin` DECIMAL(36, 18) DEFAULT 0.000000000000000000,
    `locked_user_margin` DECIMAL(36, 18) DEFAULT 0.000000000000000000,
    `locked_order_margin` DECIMAL(36, 18) DEFAULT 0.000000000000000000,
    `leverage` DECIMAL(10, 2) DEFAULT 10.00,
    `mark_price` DECIMAL(36, 18) DEFAULT 0.000000000000000000,
    `maintenance_margin` DECIMAL(36, 18) DEFAULT 0.000000000000000000,
    `margin_currency_short_name` VARCHAR(16) DEFAULT 'USDT',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_futures_positions_user_id` (`user_id`),
    KEY `idx_futures_positions_symbol` (`symbol`),
    CONSTRAINT `fk_futures_positions_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_futures_positions_instrument` FOREIGN KEY (`symbol`) REFERENCES `futures_instruments` (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Table: futures_orders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `futures_orders` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `pair` VARCHAR(32) NOT NULL,
    `side` VARCHAR(16) NOT NULL,
    `order_type` VARCHAR(32) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `price` DECIMAL(36, 18) NULL,
    `stop_price` DECIMAL(36, 18) NULL,
    `avg_price` DECIMAL(36, 18) NULL,
    `total_quantity` DECIMAL(36, 18) NOT NULL,
    `remaining_quantity` DECIMAL(36, 18) NOT NULL,
    `cancelled_quantity` DECIMAL(36, 18) DEFAULT 0.000000000000000000,
    `executed_quantity` DECIMAL(36, 18) DEFAULT 0.000000000000000000,
    `leverage` DECIMAL(10, 2) DEFAULT 10.00,
    `take_profit_price` DECIMAL(36, 18) NULL,
    `stop_loss_price` DECIMAL(36, 18) NULL,
    `margin_currency_short_name` VARCHAR(16) DEFAULT 'USDT',
    `stage` VARCHAR(32) DEFAULT 'default',
    `group_id` VARCHAR(64) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_futures_orders_user_id` (`user_id`),
    KEY `idx_futures_orders_pair` (`pair`),
    KEY `idx_futures_orders_status` (`status`),
    CONSTRAINT `fk_futures_orders_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_futures_orders_instrument` FOREIGN KEY (`pair`) REFERENCES `futures_instruments` (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Table: futures_trades
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `futures_trades` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `order_id` VARCHAR(36) NOT NULL,
    `symbol` VARCHAR(32) NOT NULL,
    `side` VARCHAR(16) NOT NULL,
    `price` DECIMAL(36, 18) NOT NULL,
    `quantity` DECIMAL(36, 18) NOT NULL,
    `fee_amount` DECIMAL(36, 18) DEFAULT 0.000000000000000000,
    `is_maker` TINYINT(1) DEFAULT 0,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_futures_trades_order_id` (`order_id`),
    KEY `idx_futures_trades_user_id` (`user_id`),
    CONSTRAINT `fk_futures_trades_order` FOREIGN KEY (`order_id`) REFERENCES `futures_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Table: futures_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `futures_transactions` (
    `id` VARCHAR(36) NOT NULL,
    `position_id` BIGINT NOT NULL,
    `symbol` VARCHAR(32) NULL,
    `stage` VARCHAR(32) NULL,
    `amount` DECIMAL(36, 18) NULL,
    `fee_amount` DECIMAL(36, 18) NULL,
    `entry_price` DECIMAL(36, 18) NULL,
    `leverage` DECIMAL(10, 2) NULL,
    `source` VARCHAR(32) NULL,
    `parent_type` VARCHAR(64) NULL,
    `parent_id` VARCHAR(64) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_futures_trans_pos_id` (`position_id`),
    CONSTRAINT `fk_futures_trans_position` FOREIGN KEY (`position_id`) REFERENCES `futures_positions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. Table: futures_wallet_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `futures_wallet_transactions` (
    `id` VARCHAR(36) NOT NULL,
    `wallet_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NULL,
    `transaction_type` VARCHAR(32) NOT NULL,
    `amount` DECIMAL(36, 18) NOT NULL,
    `currency_short_name` VARCHAR(16) NULL,
    `reason` VARCHAR(64) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_fwt_wallet_id` (`wallet_id`),
    KEY `idx_fwt_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. Table: payments (VNPay Deposits)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NULL,
    `payment_status` VARCHAR(32) NOT NULL,
    `payment_gateway` VARCHAR(32) NOT NULL,
    `amount_vnd` DECIMAL(18, 2) NOT NULL,
    `usdt_amount` DECIMAL(18, 4) NOT NULL,
    `exchange_rate` DECIMAL(18, 2) NULL,
    `transaction_id` VARCHAR(100) NOT NULL,
    `gateway_payment_id` VARCHAR(100) NULL,
    `bank_code` VARCHAR(50) NULL,
    `response_code` VARCHAR(50) NULL,
    `order_info` VARCHAR(255) NULL,
    `initiated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_payments_transaction_id` (`transaction_id`),
    KEY `idx_payments_user_id` (`user_id`),
    CONSTRAINT `fk_payments_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. Table: refresh_tokens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NULL,
    `refresh_token` VARCHAR(2000) NOT NULL,
    `expiry_date` DATETIME NULL,
    `create_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_refresh_tokens_user_id` (`user_id`),
    CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. Table: Blacklisted_tokens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Blacklisted_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NULL,
    `token` VARCHAR(2000) NOT NULL,
    `expiry_date` DATETIME NULL,
    `create_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. Table: margin_orders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `margin_orders` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `market` VARCHAR(32) NOT NULL,
    `side` VARCHAR(16) NULL,
    `order_type` VARCHAR(32) NULL,
    `status` VARCHAR(32) NULL,
    `price` DECIMAL(36, 18) NULL,
    `quantity` DECIMAL(36, 18) NULL,
    `leverage` DECIMAL(36, 18) NULL,
    `sl_price` DECIMAL(36, 18) NULL,
    `target_price` DECIMAL(36, 18) NULL,
    `stop_price` DECIMAL(36, 18) NULL,
    `pnl` DECIMAL(36, 18) NULL,
    `initial_margin` DECIMAL(36, 18) NULL,
    `trailing_sl` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_margin_orders_user_id` (`user_id`),
    KEY `idx_margin_orders_market` (`market`),
    CONSTRAINT `fk_margin_orders_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_margin_orders_market` FOREIGN KEY (`market`) REFERENCES `markets` (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 17. Table: margin_internal_orders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `margin_internal_orders` (
    `id` VARCHAR(36) NOT NULL,
    `margin_order_id` VARCHAR(36) NOT NULL,
    `status` VARCHAR(32) NULL,
    `bo_stage` VARCHAR(32) NULL,
    `total_quantity` DECIMAL(36, 18) NULL,
    `filled_quantity` DECIMAL(36, 18) NULL,
    `cancelled_quantity` DECIMAL(36, 18) NULL,
    `price_per_unit` DECIMAL(36, 18) NULL,
    PRIMARY KEY (`id`),
    KEY `idx_mio_margin_order_id` (`margin_order_id`),
    CONSTRAINT `fk_mio_margin_order` FOREIGN KEY (`margin_order_id`) REFERENCES `margin_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 18. Table: lend_orders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lend_orders` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `currency_short_name` VARCHAR(16) NULL,
    `amount` DECIMAL(36, 18) NULL,
    `interest` DECIMAL(36, 18) NULL,
    `interest_type` VARCHAR(32) NULL,
    `duration` INT NULL,
    `side` VARCHAR(16) NULL,
    `status` VARCHAR(32) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `settled_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    KEY `idx_lend_orders_user_id` (`user_id`),
    CONSTRAINT `fk_lend_orders_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 19. Table: user_daily_equity_snapshots
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_daily_equity_snapshots` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `snapshot_date` DATE NOT NULL,
    `total_equity` DECIMAL(24, 8) NULL,
    `net_deposit` DECIMAL(24, 8) NULL,
    `daily_pnl` DECIMAL(24, 8) NULL,
    `cumulative_pnl` DECIMAL(24, 8) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_daily_snapshot` (`user_id`, `snapshot_date`),
    KEY `idx_udes_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 20. Table: user_hourly_equity_snapshots
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_hourly_equity_snapshots` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `snapshot_time` DATETIME NOT NULL,
    `total_equity` DECIMAL(24, 8) NULL,
    `hourly_pnl` DECIMAL(24, 8) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_hourly_snapshot` (`user_id`, `snapshot_time`),
    KEY `idx_uhes_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Initial Seed Data: Markets & Futures Instruments
-- -----------------------------------------------------------------------------
INSERT INTO `markets` (`symbol`, `pair`, `base_currency_short_name`, `target_currency_short_name`, `status`, `min_quantity`, `max_quantity`, `min_price`, `max_price`, `min_notional`, `current_price`)
VALUES 
('BTCUSDT', 'BTC/USDT', 'BTC', 'USDT', 'ACTIVE', 0.00001000, 100.00000000, 1000.00000000, 1000000.00000000, 5.00000000, 64250.000000000000000000),
('ETHUSDT', 'ETH/USDT', 'ETH', 'USDT', 'ACTIVE', 0.00010000, 1000.00000000, 100.00000000, 100000.00000000, 5.00000000, 2650.000000000000000000),
('SOLUSDT', 'SOL/USDT', 'SOL', 'USDT', 'ACTIVE', 0.01000000, 10000.00000000, 1.00000000, 10000.00000000, 5.00000000, 145.000000000000000000),
('BNBUSDT', 'BNB/USDT', 'BNB', 'USDT', 'ACTIVE', 0.00100000, 5000.00000000, 10.00000000, 50000.00000000, 5.00000000, 560.000000000000000000),
('XRPUSDT', 'XRP/USDT', 'XRP', 'USDT', 'ACTIVE', 1.00000000, 500000.00000000, 0.01000000, 100.00000000, 5.00000000, 0.580000000000000000),
('DOGEUSDT', 'DOGE/USDT', 'DOGE', 'USDT', 'ACTIVE', 1.00000000, 1000000.00000000, 0.00100000, 10.00000000, 5.00000000, 0.105000000000000000)
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

INSERT INTO `futures_instruments` (`symbol`, `base_asset`, `quote_asset`, `margin_currency_short_name`, `kind`, `maintenance_margin_rate`, `last_price`, `mark_price`, `max_leverage_long`, `max_leverage_short`, `price_increment`, `quantity_increment`, `min_notional`, `maker_fee`, `taker_fee`, `funding_frequency`, `status`)
VALUES 
('BTCUSDT', 'BTC', 'USDT', 'USDT', 'perpetual', 0.005000, 64250.000000000000000000, 64250.000000000000000000, 125.00, 125.00, 0.100000000000000000, 0.001000000000000000, 5.000000000000000000, 0.000200, 0.000500, 8, 'active'),
('ETHUSDT', 'ETH', 'USDT', 'USDT', 'perpetual', 0.005000, 2650.000000000000000000, 2650.000000000000000000, 100.00, 100.00, 0.010000000000000000, 0.010000000000000000, 5.000000000000000000, 0.000200, 0.000500, 8, 'active'),
('SOLUSDT', 'SOL', 'USDT', 'USDT', 'perpetual', 0.010000, 145.000000000000000000, 145.000000000000000000, 50.00, 50.00, 0.010000000000000000, 0.100000000000000000, 5.000000000000000000, 0.000200, 0.000500, 8, 'active')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

SET FOREIGN_KEY_CHECKS = 1;
