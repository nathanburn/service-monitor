# Kry/Livi - Service Monitor by Nathan Burn

Basic requirements - met:
- A user needs to be able to add a new service with URL and a name
- Added services have to be kept when the server is restarted
- Display the name, url, creation time and status for each service
- Provide a README in english with instructions on how to run the application

Extra requirements - met:
- We want full create/update/delete functionality for services
- The results from the poller are automatically shown to the user (no
need to reload the page to see results)
- Protect the poller from misbehaving services (for example answering
really slowly)

## Run with Docker Compose

Pre-requisties:
- Installed Docker (and Docker-Compose is enabled)

Steps:
1. Run MySql Database with Docker-Compose
```
docker-compose -f docker-compose-db.yml up --force-recreate --build -d
```

2. Run App Docker-Compose
```
docker-compose -f docker-compose-app.yml up --force-recreate --build
```

## OR Build and Run Locally

Pre-requisties:
- Installed Java 11 JDK or higher
- Installed Maven

### Run App with with Maven Spring-Boot
Run with `maven` spring boot:
```
mvn spring-boot:run
```

### Or run App with JAR file
1. Build with `maven` package:
```
mvn clean package
```
2. Run with `jar` file:
```
java -jar target/service-monitor-0.0.2.jar
```

## Connect and Query MySql Database
1. Connect to the runing database container:
```
docker exec -it database mysql -uroot -p
```
2. Select to use the `dev` database:
```
USE dev
```
3. Select to view all the records from the `services` database:
```
SELECT * FROM services;
```

## Get mysqldump from MySql Database in container
Execute to capture mysqldump of the `dev` database:
```
docker exec -i database mysqldump -uroot -p --databases dev --skip-comments > /Users/[USERNAME]/Documents/dev-dump.sql
```

## References
- Websockets incl SockJS https://github.com/spring-guides/tut-react-and-spring-data-rest/tree/master/events
