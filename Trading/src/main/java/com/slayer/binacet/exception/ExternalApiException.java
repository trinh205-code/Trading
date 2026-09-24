package com.slayer.binacet.exception;

/**
 * Thrown when a call to an external service (Binance API, blockchain node, email provider...)
 * fails. Keep this distinct from IllegalArgumentException: the caller's input was fine, the
 * *dependency* is what failed — so it should map to a 502/503, not a 400.
 */
public class ExternalApiException extends RuntimeException {

    public ExternalApiException(String message) {
        super(message);
    }

    public ExternalApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
