# Deno base image - Updated for CVE-2025-61786 security fix
FROM denoland/deno:alpine-2.6.9

# Set environment variables
ENV HOME=/app \
    DENO_DIR=/app/.deno \
    DENO_ENV=production \
    XDG_CONFIG_HOME=/app/.config \
    XDG_CACHE_HOME=/app/.cache \
    XDG_DATA_HOME=/app/.local/share \
    NPM_CONFIG_CACHE=/app/.npm

# Install minimal runtime tools (Chromium removed — preview rendering offloaded to CF Worker)
RUN apk add --no-cache \
    bash \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create necessary directories
RUN mkdir -p /app \
    /app/.deno \
    /app/.npm \
    /app/.config \
    /app/.cache \
    /app/.local/share \
    /app/node_modules/.deno

# Set up permissions more securely
RUN chown -R deno:deno /app && \
    chmod -R 755 /app && \
    chmod -R 775 /app/.deno /app/.npm /app/node_modules/.deno

WORKDIR /app

# Copy files and set permissions
COPY --chown=deno:deno . .

# Clean any existing caches and old build artifacts
RUN rm -rf node_modules/.deno && \
    rm -rf .npm && \
    rm -rf .deno && \
    rm -rf _fresh

# Switch to deno user for build steps
USER deno

# Build steps with all permissions granted and error handling
# Build Fresh assets and ensure they're available
RUN DENO_ENV=production deno run --allow-all main.ts build || (echo "Build failed" && exit 1)

# Cache dependencies against the committed lockfile. --frozen=true forces deno
# to fail the build if deno.lock is missing, out-of-date, or any integrity hash
# doesn't match — defends against silent transitive-dep replacement (the npm
# supply-chain attack class). To regenerate the lock after intentional dep
# updates: `deno cache --lock=deno.lock main.ts` locally, commit deno.lock.
# Optionally add --minimum-dependency-age=P7D when updating deps to filter out
# packages published in the last 7 days (Deno 2.6+ unstable flag).
RUN DENO_DIR=/app/.deno \
    NPM_CONFIG_CACHE=/app/.npm \
    deno cache --frozen=true main.ts || (echo "Cache failed — lockfile mismatch or missing? Run 'deno cache --lock=deno.lock main.ts' locally and recommit." && exit 1)

# Ensure _fresh directory is present and has correct permissions
RUN ls -la /app/_fresh 2>/dev/null || echo "Warning: _fresh directory not found after build"

# Verify the build environment
RUN echo "Verifying environment and permissions:" && \
    ls -la /app && \
    ls -la /app/.deno || true && \
    ls -la /app/node_modules/.deno || true && \
    ls -la /app/.npm || true

EXPOSE 8000

# Runtime environment variables - Enable Redis at runtime
ENV DENO_PERMISSIONS="--allow-net --allow-read --allow-write --allow-env --allow-sys" \
    SKIP_REDIS=false \
    SKIP_REDIS_CONNECTION=false \
    SKIP_REDIS_TLS=true \
    DENO_ENV=production \
    CACHE=true \
    REDIS_TIMEOUT=15000 \
    REDIS_MAX_RETRIES=10

# Ensure Fresh static files are available at runtime
RUN if [ -d "/app/_fresh" ]; then \
      echo "Fresh build directory found with $(ls -1 /app/_fresh | wc -l) files"; \
    else \
      echo "ERROR: Fresh build directory not found!"; \
      exit 1; \
    fi

CMD ["sh", "-c", "deno run $DENO_PERMISSIONS main.ts"]
