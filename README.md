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

3. Navigate to `http://localhost:8887` in your browser.


## OR Build and Run Locally

Pre-requisties:
- Installed Java 11 JDK or higher
- Installed Maven

### Run App with with Maven Spring-Boot
1. Run with `maven` spring boot:
```
mvn spring-boot:run
```
2. Navigate to `http://localhost:8080` in your browser.

### Or run App with JAR file
1. Build with `maven` package:
```
mvn clean package
```
2. Run with `jar` file:
```
java -jar target/service-monitor-0.0.2.jar
```
3. Navigate to `http://localhost:8080` in your browser.


## Connect and Query MySql Database
1. Connect to the runing database container:
```
docker exec -it database mysql -uroot -p
```
2. Select to use the `dev` database:
```
USE dev
```
3. Select to view all the records from the `service` database:
```
SELECT * FROM service;
```

## Get mysqldump from MySql Database in container
Execute to capture mysqldump of the `dev` database:
```
docker exec -i database mysqldump -uroot -p --databases dev --skip-comments > /Users/[USERNAME]/Documents/dev-dump.sql
```

## References
- Websockets incl SockJS https://github.com/spring-guides/tut-react-and-spring-data-rest/tree/master/events


## Time Constraints - What would I have done with more time?

- **Higher code coverage / tests** - write more unit tests for the models, views/UI and controllers/REST services.

- **Separation** - split the models, views/UI and controllers/REST services into different libraries/projects to enable better separation of responsibilites (i.e. the UI is run/hosted in isolation from the REST service) and ease maintainability and code sharing/re-use.

- **Configuration** - all magic strings and numbers should be managed through the `application.properties`, to enable easy override/configuartion with environment variables.


## Future Considerations - What would I do to manage this as a real product?

### Build Pipeline / Continuous Integration

- Tests incl. **Unit Tests** (e.g. `SonarQube` incl. coverage and security advice), **Component Tests**, **Contract Tests** (e.g. `PACT` incl REST/HTTP contract verification) and **Performance Tests** (e.g. `Taurus/JMeter` incl. scenario based concurrency and scale tests)

- Vulnerability Scanning e.g. **JFrog Xray** (identifying security and license violations) and **Snyk** (find and fix vulnerabilities)

- Upload builds/release bundles (`Docker` images, `Helm` charts etc.) to an artifact store e.g. **JFrog Artifactory**

- Track all build and deployment artifacts e.g. **Grafeas** (artifact metadata API to audit and govern your software supply chain)

### Release Pipeline / Continuous Deployment

- Accesses builds/release bundles through an artifact store e.g. **JFrog Artifactory** (i.e. the release pipeline for good security concern separation should NOT have access to the source code / repositories).

- Validate build and deployment artifacts prior to use e.g. **Grafeas** (artifact metadata API to audit and govern your software supply chain)

- Infrastructure-as-Code updates using **Terraform** for cloud dependencies e.g. databases, caches, service buses etc.

- Deployment to the Cloud (Kubernetes **clusters across multiple regions and data centers**) using `Helm CLI` or `Spinnaker`

- Post deployment tests incl **Health Check Tests**, **Component Tests**, **Performance Tests** and **Integration Tests** to **gate on roll-out to the next environment** e.g. rolling out across 2 or 3 environments in-turn e.g. `DEV/TEST`, `STAGE` and `PRODUCTION`
