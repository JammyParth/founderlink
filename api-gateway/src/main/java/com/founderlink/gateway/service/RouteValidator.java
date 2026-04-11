package com.founderlink.gateway.service;

import com.founderlink.gateway.config.GatewaySecurityProperties;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;

@Service
public class RouteValidator {

    private final GatewaySecurityProperties gatewaySecurityProperties;
    private final AntPathMatcher pathMatcher;

    public RouteValidator(GatewaySecurityProperties gatewaySecurityProperties) {
        this.gatewaySecurityProperties = gatewaySecurityProperties;
        this.pathMatcher = new AntPathMatcher();
        this.pathMatcher.setCaseSensitive(true);
    }

    public boolean isSecured(ServerHttpRequest request) {
        String requestPath = normalizePath(request.getPath().value());
        if (matchesConfiguredPath(requestPath, gatewaySecurityProperties.getPublicPaths())) {
            return false;
        }

        return !(isPublicReadRequest(request)
                && matchesConfiguredPath(requestPath, gatewaySecurityProperties.getPublicGetPaths()));
    }

    @SuppressWarnings("null")
    private boolean matchesConfiguredPath(String requestPath, List<String> configuredPaths) {
        return safePaths(configuredPaths).stream()
                .filter(StringUtils::hasText)
                .map(this::normalizePath)
                .anyMatch(publicPath -> pathMatcher.match(publicPath, requestPath));
    }

    private boolean isPublicReadRequest(ServerHttpRequest request) {
        HttpMethod method = request.getMethod();
        return HttpMethod.GET.equals(method) || HttpMethod.HEAD.equals(method);
    }

    private List<String> safePaths(List<String> configuredPaths) {
        return configuredPaths != null ? configuredPaths : Collections.emptyList();
    }

    private String normalizePath(String path) {
        if (!StringUtils.hasText(path)) {
            return "/";
        }
        if (path.length() > 1 && path.endsWith("/")) {
            return path.substring(0, path.length() - 1);
        }
        return path;
    }
}
