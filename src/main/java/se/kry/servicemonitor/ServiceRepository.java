package se.kry.servicemonitor;

import org.springframework.data.repository.PagingAndSortingRepository;

public interface ServiceRepository extends PagingAndSortingRepository<Service, Long> { }