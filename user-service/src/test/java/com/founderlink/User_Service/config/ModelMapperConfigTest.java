package com.founderlink.User_Service.config;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.modelmapper.ModelMapper;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import static org.assertj.core.api.Assertions.assertThat;

class ModelMapperConfigTest {

    @Test
    void modelMapperBean_shouldNotBeNull() {
        ModelMapperConfig config = new ModelMapperConfig();
        ModelMapper mapper = config.modelMapper();
        assertThat(mapper).isNotNull();
    }

    @Test
    void modelMapperBean_shouldMapSimpleFields() {
        ModelMapper mapper = new ModelMapperConfig().modelMapper();

        Source source = new Source("test-value");
        Target target = mapper.map(source, Target.class);

        assertThat(target.getName()).isEqualTo("test-value");
    }

    @Test
    void openApiBean_shouldReturnConfiguredOpenAPI() {
        OpenApiConfig config = new OpenApiConfig();
        OpenAPI api = config.customOpenAPI();

        assertThat(api).isNotNull();
        assertThat(api.getInfo().getTitle()).isEqualTo("User Service API Documentation");
        assertThat(api.getInfo().getVersion()).isEqualTo("1.0.0");
        assertThat(api.getServers()).hasSize(1);
        assertThat(api.getServers().get(0).getUrl()).isEqualTo("/");
    }

    @Test
    void redisCacheManagerBean_shouldReturnRedisCacheManager() {
        RedisConnectionFactory mockFactory = Mockito.mock(RedisConnectionFactory.class);
        RedisConfig config = new RedisConfig();
        CacheManager manager = config.cacheManager(mockFactory);

        assertThat(manager).isNotNull().isInstanceOf(RedisCacheManager.class);
    }

    // Simple inner classes for mapping test
    static class Source {
        private String name;
        Source(String name) { this.name = name; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }

    static class Target {
        private String name;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }
}

