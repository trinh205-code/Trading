package com.slayer.binacet.service.impl;

import com.slayer.binacet.entity.FuturesPosition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class FuturesPnLServiceImplTest {

    private FuturesPnLServiceImpl pnlService;

    @BeforeEach
    void setUp() {
        pnlService = new FuturesPnLServiceImpl();
    }

    @Nested
    @DisplayName("Tests for calculateUnrealizedPnl")
    class UnrealizedPnlTests {

        @Test
        @DisplayName("LONG vị thế có lãi: mua 50,000, giá hiện tại 55,000, khối lượng 2 BTC")
        void testCalculateUnrealizedPnl_Long_Profit() {
            FuturesPosition position = FuturesPosition.builder()
                    .activePos(new BigDecimal("2.0"))
                    .avgPrice(new BigDecimal("50000.0"))
                    .build();
            BigDecimal markPrice = new BigDecimal("55000.0");

            BigDecimal pnl = pnlService.calculateUnrealizedPnl(position, markPrice);

            // (55,000 - 50,000) * 2 = 10,000
            assertEquals(0, new BigDecimal("10000.0").compareTo(pnl));
        }

        @Test
        @DisplayName("LONG vị thế lỗ: mua 50,000, giá hiện tại 48,000, khối lượng 2 BTC")
        void testCalculateUnrealizedPnl_Long_Loss() {
            FuturesPosition position = FuturesPosition.builder()
                    .activePos(new BigDecimal("2.0"))
                    .avgPrice(new BigDecimal("50000.0"))
                    .build();
            BigDecimal markPrice = new BigDecimal("48000.0");

            BigDecimal pnl = pnlService.calculateUnrealizedPnl(position, markPrice);

            // (48,000 - 50,000) * 2 = -4,000
            assertEquals(0, new BigDecimal("-4000.0").compareTo(pnl));
        }

        @Test
        @DisplayName("SHORT vị thế có lãi: bán 50,000, giá hiện tại 45,000, khối lượng -2 BTC")
        void testCalculateUnrealizedPnl_Short_Profit() {
            FuturesPosition position = FuturesPosition.builder()
                    .activePos(new BigDecimal("-2.0"))
                    .avgPrice(new BigDecimal("50000.0"))
                    .build();
            BigDecimal markPrice = new BigDecimal("45000.0");

            BigDecimal pnl = pnlService.calculateUnrealizedPnl(position, markPrice);

            // (45,000 - 50,000) * (-2) = (-5,000) * (-2) = 10,000
            assertEquals(0, new BigDecimal("10000.0").compareTo(pnl));
        }

        @Test
        @DisplayName("SHORT vị thế lỗ: bán 50,000, giá hiện tại 53,000, khối lượng -2 BTC")
        void testCalculateUnrealizedPnl_Short_Loss() {
            FuturesPosition position = FuturesPosition.builder()
                    .activePos(new BigDecimal("-2.0"))
                    .avgPrice(new BigDecimal("50000.0"))
                    .build();
            BigDecimal markPrice = new BigDecimal("53000.0");

            BigDecimal pnl = pnlService.calculateUnrealizedPnl(position, markPrice);

            // (53,000 - 50,000) * (-2) = (3,000) * (-2) = -6,000
            assertEquals(0, new BigDecimal("-6000.0").compareTo(pnl));
        }

        @Test
        @DisplayName("Vị thế rỗng hoặc thông tin null -> PnL trả về ZERO")
        void testCalculateUnrealizedPnl_NullOrZero() {
            FuturesPosition posZero = FuturesPosition.builder()
                    .activePos(BigDecimal.ZERO)
                    .avgPrice(new BigDecimal("50000.0"))
                    .build();
            assertEquals(BigDecimal.ZERO, pnlService.calculateUnrealizedPnl(posZero, new BigDecimal("55000.0")));

            FuturesPosition posNullQty = FuturesPosition.builder()
                    .activePos(null)
                    .avgPrice(new BigDecimal("50000.0"))
                    .build();
            assertEquals(BigDecimal.ZERO, pnlService.calculateUnrealizedPnl(posNullQty, new BigDecimal("55000.0")));

            FuturesPosition posNullPrice = FuturesPosition.builder()
                    .activePos(BigDecimal.ONE)
                    .avgPrice(null)
                    .build();
            assertEquals(BigDecimal.ZERO, pnlService.calculateUnrealizedPnl(posNullPrice, new BigDecimal("55000.0")));
        }
    }

    @Nested
    @DisplayName("Tests for calculateRoi")
    class RoiTests {

        @Test
        @DisplayName("Tính ROI chuẩn xác theo lockedUserMargin")
        void testCalculateRoi_Success() {
            // Margin = 1,000 USDT, PnL = (55,000 - 50,000) * 0.1 = 500 USDT -> ROI = 50%
            FuturesPosition position = FuturesPosition.builder()
                    .activePos(new BigDecimal("0.1"))
                    .avgPrice(new BigDecimal("50000.0"))
                    .lockedUserMargin(new BigDecimal("1000.0"))
                    .build();
            BigDecimal markPrice = new BigDecimal("55000.0");

            BigDecimal roi = pnlService.calculateRoi(position, markPrice);

            assertEquals(0, new BigDecimal("50.0000").compareTo(roi));
        }

        @Test
        @DisplayName("LockedUserMargin bằng 0 hoặc null -> ROI trả về ZERO")
        void testCalculateRoi_ZeroMargin() {
            FuturesPosition position = FuturesPosition.builder()
                    .activePos(new BigDecimal("0.1"))
                    .avgPrice(new BigDecimal("50000.0"))
                    .lockedUserMargin(BigDecimal.ZERO)
                    .build();

            assertEquals(BigDecimal.ZERO, pnlService.calculateRoi(position, new BigDecimal("55000.0")));
        }
    }

    @Nested
    @DisplayName("Tests for calculateLiquidationPrice")
    class LiquidationPriceTests {

        @Test
        @DisplayName("Tính giá thanh lý cho vị thế LONG")
        void testCalculateLiquidationPrice_Long() {
            // Vị thế LONG 1 BTC tại 50,000. Margin = 5,000 (leverage 10x). Tỉ lệ mmr = 0.5% (0.005)
            // maintenanceMargin = 50,000 * 1 * 0.005 = 250
            // buffer = (5,000 - 250) / 1 = 4,750
            // liqPrice = 50,000 - 4,750 = 45,250
            FuturesPosition position = FuturesPosition.builder()
                    .activePos(new BigDecimal("1.0"))
                    .avgPrice(new BigDecimal("50000.0"))
                    .lockedUserMargin(new BigDecimal("5000.0"))
                    .build();
            BigDecimal mmr = new BigDecimal("0.005");

            BigDecimal liqPrice = pnlService.calculateLiquidationPrice(position, mmr);

            assertNotNull(liqPrice);
            assertEquals(0, new BigDecimal("45250.0").compareTo(liqPrice));
        }

        @Test
        @DisplayName("Tính giá thanh lý cho vị thế SHORT")
        void testCalculateLiquidationPrice_Short() {
            // Vị thế SHORT 1 BTC tại 50,000. Margin = 5,000 (leverage 10x). Tỉ lệ mmr = 0.5% (0.005)
            // maintenanceMargin = 50,000 * 1 * 0.005 = 250
            // buffer = (5,000 - 250) / 1 = 4,750
            // liqPrice = 50,000 + 4,750 = 54,750
            FuturesPosition position = FuturesPosition.builder()
                    .activePos(new BigDecimal("-1.0"))
                    .avgPrice(new BigDecimal("50000.0"))
                    .lockedUserMargin(new BigDecimal("5000.0"))
                    .build();
            BigDecimal mmr = new BigDecimal("0.005");

            BigDecimal liqPrice = pnlService.calculateLiquidationPrice(position, mmr);

            assertNotNull(liqPrice);
            assertEquals(0, new BigDecimal("54750.0").compareTo(liqPrice));
        }

        @Test
        @DisplayName("Vị thế có activePos = 0 hoặc avgPrice null -> trả về null")
        void testCalculateLiquidationPrice_Invalid() {
            FuturesPosition posZero = FuturesPosition.builder()
                    .activePos(BigDecimal.ZERO)
                    .avgPrice(new BigDecimal("50000.0"))
                    .build();
            assertNull(pnlService.calculateLiquidationPrice(posZero, new BigDecimal("0.005")));

            FuturesPosition posNullPrice = FuturesPosition.builder()
                    .activePos(BigDecimal.ONE)
                    .avgPrice(null)
                    .build();
            assertNull(pnlService.calculateLiquidationPrice(posNullPrice, new BigDecimal("0.005")));
        }
    }
}
