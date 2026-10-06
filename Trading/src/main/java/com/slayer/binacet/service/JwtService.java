package com.slayer.binacet.service;



import com.slayer.binacet.config.JwtConfig;
import com.slayer.binacet.entity.RefreshToken;
import com.slayer.binacet.repository.BlacklistedRepository;
import com.slayer.binacet.repository.RefreshTokenRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;
import java.util.function.Function;

import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {
    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);

    private final JwtConfig jwtConfig;
    private  final Key key;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private BlacklistedRepository blacklistedRepository;
    public JwtService(JwtConfig jwtConfig) {
        this.jwtConfig = jwtConfig;
        this.key = Keys.hmacShaKeyFor(Base64.getEncoder().encode(jwtConfig.getSecretKey().getBytes()));
    }

    public String generateToken(String userId, String email) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtConfig.getExpirationTime());

        return Jwts.builder()
                .setSubject(userId)
                .claim("email", email)
                .setIssuer(jwtConfig.getIssuer())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(SignatureAlgorithm.HS512, key)
                .compact();
    }

    public String generateTokenAuth02(
            Long userId,
            String email,
            String role,
            long expireMinutes
    ) {
        Date now = new Date();
        Date expiryDate = new Date(
                now.getTime() + expireMinutes * 60 * 1000
        );

        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("email", email)
                .claim("role", role) // 👈 QUAN TRỌNG
                .setIssuer(jwtConfig.getIssuer())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(SignatureAlgorithm.HS512, key)
                .compact();
    }


    public String generateRefreshToken(String userId, String email) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtConfig.getRefreshTokenExpiretionTime());

        String refreshToken = Jwts.builder()
                .setSubject(userId)
                .claim("email", email)
                .setIssuer(jwtConfig.getIssuer())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(SignatureAlgorithm.HS512, key)
                .compact();

        LocalDateTime localDateTime = expiryDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();

        Optional<RefreshToken> optionalRefreshToken = refreshTokenRepository.findByUserId(userId);
        if(optionalRefreshToken.isPresent()) {
            RefreshToken dbrefreshToken = optionalRefreshToken.get();

            dbrefreshToken.setRefreshToken(refreshToken);
            dbrefreshToken.setExpiryDate(localDateTime);

            refreshTokenRepository.save(dbrefreshToken);
        } else {
            RefreshToken insertToken = new RefreshToken();
            insertToken.setRefreshToken(refreshToken);
            insertToken.setUserId(userId);
            insertToken.setExpiryDate(localDateTime);

            refreshTokenRepository.save(insertToken);
        }


        return refreshToken;
    }


    public String getEmailFromJwt(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
        return claims.get("email", String.class);
    }



    public String getUserIdFromJwt(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
        return claims.getSubject();
    }

    /*
        1. token có đúng định dạng khoong
        2. chữ kí của token có đúng không
        3. kiểm tra xem token đã hết hạn hay chưa
        4. user_id của token có khớp với userDetails
        5.kiểm tra xem token có trong blacklist hay k
        6. kiểm tra quyền
     */


    public boolean isTokenFormatValid(String token) {

        try {
            String[] tokenParts = token.split("\\.");

            return tokenParts.length == 3;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isSignatureValid(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isBlacklistedToken(String token) {
        return blacklistedRepository.existsByToken(token);
    }




    public Key getSigningKey(String token) {
        byte[] keyBytes = jwtConfig.getSecretKey().getBytes();
        return Keys.hmacShaKeyFor(Base64.getEncoder().encode(keyBytes));
    }

    public boolean isTokenExpired(String token) {
        try {
            Date expiration = getClaimFromToken(token, Claims::getExpiration);
            return expiration.before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        }
    }


    public boolean isIssuerToken(String token) {
        String tokenIssuer = getClaimFromToken(token, Claims::getIssuer);
        return jwtConfig.getIssuer().equals(tokenIssuer);

    }





//    public String extractToken(String token) {
//        return extractToken(token, Claims::getSubject);
//    }

    private <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims =getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }


    public Claims getAllClaimsFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean isRefreshTokenValid(String token) {
        try{

            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            RefreshToken refreshToken = refreshTokenRepository.findByRefreshToken(token).orElseThrow(
                    () -> new RuntimeException("RefreshToken not found")
            );

            return refreshToken != null;

        } catch (Exception e) {
            return false;
        }
    }
}
