package se.kry.servicemonitor;

import static se.kry.servicemonitor.WebSocketConfiguration.*;

import java.net.http.HttpClient;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.data.rest.core.annotation.HandleAfterCreate;
import org.springframework.data.rest.core.annotation.HandleAfterDelete;
import org.springframework.data.rest.core.annotation.HandleAfterSave;
import org.springframework.data.rest.core.annotation.RepositoryEventHandler;
import org.springframework.hateoas.server.EntityLinks;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RepositoryEventHandler(Service.class)
public class EventHandler {

	Logger logger = LoggerFactory.getLogger(EventHandler.class);

	private final EntityLinks entityLinks;
	private final ServerProperties serverProperties;
	private final ServiceRepository serviceRepository;
	private final SimpMessagingTemplate simpMessagingTemplate;
	private final HttpClient httpClient;

	@Autowired
	public EventHandler(
		EntityLinks entityLinks,
		ServerProperties serverProperties,
		ServiceRepository serviceRepository,
		SimpMessagingTemplate simpMessagingTemplate
	) {
		this.entityLinks = entityLinks;
		this.httpClient = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(3))
			.build();
		this.serverProperties = serverProperties;
		this.serviceRepository = serviceRepository;
		this.simpMessagingTemplate = simpMessagingTemplate;
	}

	@HandleAfterCreate
	public void newService(Service service) {
		this.simpMessagingTemplate.convertAndSend(
				MESSAGE_PREFIX + "/newService", getPath(service));

		service.pollUrl(
			httpClient,
			logger,
			simpMessagingTemplate,
			serverProperties,
			serviceRepository
		);
	}

	@HandleAfterDelete
	public void deleteService(Service service) {
		this.simpMessagingTemplate.convertAndSend(
				MESSAGE_PREFIX + "/deleteService", getPath(service));
	}

	@HandleAfterSave
	public void updateService(Service service) {
		this.simpMessagingTemplate.convertAndSend(
				MESSAGE_PREFIX + "/updateService", getPath(service));
		
		service.pollUrl(
			httpClient,
			logger,
			simpMessagingTemplate,
			serverProperties,
			serviceRepository
		);
	}

	private String getPath(Service service) {
		return this.entityLinks.linkForItemResource(service.getClass(),
				service.getId()).toUri().getPath();
	}
}