package se.kry.servicemonitor;

import java.net.http.HttpClient;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ServicePoller {

    Logger logger = LoggerFactory.getLogger(ServicePoller.class);

    private final ServerProperties serverProperties;
    private final ServiceRepository serviceRepository;
    private final SimpMessagingTemplate simpMessagingTemplate;

    @Autowired
    public ServicePoller(
        ServerProperties serverProperties,
        ServiceRepository serviceRepository,
        SimpMessagingTemplate simpMessagingTemplate
    ) {
        this.serverProperties = serverProperties;
        this.serviceRepository = serviceRepository;
        this.simpMessagingTemplate = simpMessagingTemplate;
    }

    @Scheduled(fixedDelay = 60000, initialDelay = 10000)
    public void scheduleFixedDelayTask() {
        Iterable<Service> services = serviceRepository.findAll();

        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

        services.forEach(service -> {
            service.pollUrl(
                httpClient,
                logger,
                simpMessagingTemplate,
                serverProperties,
                serviceRepository
            );
        });
    }
}
