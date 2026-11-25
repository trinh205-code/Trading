# Base image Java 17 JRE siêu nhẹ (Alpine Linux ~150MB)
FROM eclipse-temurin:17-jre-alpine

# Thư mục làm việc trong container
WORKDIR /app

# Copy file .jar được build từ Maven target vào container
COPY target/*.jar app.jar

# Mở port 8080 của Spring Boot
EXPOSE 8080

# Chạy ứng dụng Spring Boot
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
