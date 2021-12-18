package se.kry.servicemonitor;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.concurrent.CompletableFuture;
import java.util.Objects;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Version;

import com.fasterxml.jackson.annotation.JsonIgnore;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.slf4j.Logger;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/**
 * @author Nathan Burn
 */
@Entity
// Display the name, url, creation time and status for each service
public class Service {
    private @Id @GeneratedValue Long id;
    private String name;
    private String url;
    private int status;

    @CreationTimestamp 
    private Instant createdTimestamp;
    @UpdateTimestamp
    private Instant updatedTimestamp;

    private @Version @JsonIgnore Long version;

    private Service() {}

    public Service(
        String name,
        String url,
        int status
    ) {
        this.name = name;
        this.url = url;
        this.status = status;
    }

    @Override
	public boolean equals(Object o) {
		if (this == o) return true;
		if (o == null || getClass() != o.getClass()) return false;
		Service service = (Service) o;
		return Objects.equals(id, service.id) &&
			Objects.equals(name, service.name) &&
			Objects.equals(url, service.url) &&
			Objects.equals(status, service.status) &&
			Objects.equals(version, service.version);
	}

	@Override
	public int hashCode() {

		return Objects.hash(id, name, url, status, version);
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}

	public int getStatus() {
		return status;
	}

	public void setStatus(int status) {
		this.status = status;
	}

	public Long getVersion() {
		return version;
	}

	public void setVersion(Long version) {
		this.version = version;
	}

	public String getCreatedTimestamp() {
		return DateTimeFormatter.ofLocalizedDateTime( FormatStyle.MEDIUM ).withZone(ZoneId.from(ZoneOffset.UTC)).format(createdTimestamp);
	}

	public String getUpdatedTimestamp() {
		return DateTimeFormatter.ofLocalizedDateTime( FormatStyle.MEDIUM ).withZone(ZoneId.from(ZoneOffset.UTC)).format(updatedTimestamp);
	}

	@Override
	public String toString() {
		return "Service{" +
			"id=" + id +
			", name='" + name + '\'' +
			", url='" + url + '\'' +
			", status='" + status + '\'' +
			", version=" + version +
			'}';
	}

	public void pollUrl(
		HttpClient httpClient,
		Logger logger,
		SimpMessagingTemplate simpMessagingTemplate,
		ServerProperties serverProperties,
		ServiceRepository serviceRepository
	) {
		logger.info("Service: " + this.getName());
		HttpRequest httpRequest = HttpRequest.newBuilder()
			.GET()
			.uri(URI.create(this.getUrl()))
			.timeout(Duration.ofSeconds(3))
			.build();

		CompletableFuture<HttpResponse<String>> future = httpClient.sendAsync(
			httpRequest,
			BodyHandlers.ofString());
			
		future.thenApply(response -> {
			setPollStatus(
				response.statusCode(),
				logger,
				simpMessagingTemplate,
				serverProperties,
				serviceRepository
			);
			return response;
		}).thenApply(HttpResponse::body)
		.exceptionally(exception -> {
			setPollStatus(
				500,
				logger,
				simpMessagingTemplate,
				serverProperties,
				serviceRepository
			);
			logger.info("Exception - Service: " + this.getName() + " - " + exception.toString());
			return exception.toString();
		});
	}

	private void setPollStatus(
		int status,
		Logger logger,
		SimpMessagingTemplate simpMessagingTemplate,
		ServerProperties serverProperties,
		ServiceRepository serviceRepository
	) {
		this.setStatus(status);
		this.updatedTimestamp = Instant.now();
		serviceRepository.save(this);
		logger.info("Service: " + this.getName() + " - " + this.getStatus());
		simpMessagingTemplate.convertAndSend(
			"/topic/updateService",
			"http://localhost:" + serverProperties.getPort() + "/api/services/" + this.getId()
		);
	}
}
