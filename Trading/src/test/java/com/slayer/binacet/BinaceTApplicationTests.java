package com.slayer.binacet;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("Cần cấu hình database test (H2/Testcontainers) trước khi chạy SpringBootTest")
class BinaceTApplicationTests {

    @Test
    void contextLoads() {
    }

}
