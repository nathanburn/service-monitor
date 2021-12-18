FROM maven:3.8.4-jdk-11 AS build
COPY src /usr/src/app/src
COPY pom.xml /usr/src/app
COPY package.json /usr/src/app
COPY webpack.config.js /usr/src/app
RUN mvn -f /usr/src/app/pom.xml clean package

FROM gcr.io/distroless/java
COPY --from=build /usr/src/app/target/service-monitor-0.0.2.jar /usr/app/service-monitor-0.0.2.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/usr/app/service-monitor-0.0.2.jar"]