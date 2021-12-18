package se.kry.servicemonitor;

import org.junit.Test;

public class ServiceTests {

    @Test
    public void getShouldReturnName() throws Exception {

        Service service = new Service("Kry", "https://kry.se", 0);

        assert(service.getName() == "Kry");
    }

    // TODO - create unit tests for `pollUrl` using Mockito
}

