import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(_req: Request, _ctx) {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Stampchain API Docs | Bitcoin Stamps REST API</title>
        <meta name="description" content="Reference for the Stampchain v2 API. Endpoints for stamps, SRC-20 balances, collections, blocks and addresses, with v2.2 and v2.3 request schemas.">
        <link rel="canonical" href="https://stampchain.io/docs">
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
          }

          /* Version Selector Styles */
          .version-selector-container {
            background: linear-gradient(135deg, #8800CC 0%, #AA00FF 100%);
            padding: 16px 20px;
            color: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 1000;
          }

          .version-selector-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            max-width: 1200px;
            margin: 0 auto;
          }

          .version-selector-title {
            font-size: 20px;
            font-weight: 600;
            color: white;
            margin: 0;
          }

          .version-selector-controls {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .version-selector {
            display: flex;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 4px;
            gap: 4px;
          }

          .version-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            background: transparent;
            color: white;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
          }

          .version-btn:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .version-btn.active {
            background: rgba(255, 255, 255, 0.2);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .version-info {
            font-size: 14px;
            opacity: 0.9;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .version-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }

          .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          /* Swagger UI Container */
          #swagger-ui {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }

          /* Custom Swagger UI Overrides */
          .swagger-ui .info .title {
            color: #AA00FF;
          }

          .swagger-ui .scheme-container {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 6px;
            margin: 20px 0;
          }

          /* Version-specific highlighting */
          .swagger-ui .version-highlight-v22 {
            border-left: 4px solid #17a2b8;
            padding-left: 12px;
            background: #f0f9ff;
          }

          .swagger-ui .version-highlight-v23 {
            border-left: 4px solid #AA00FF;
            padding-left: 12px;
            background: #fdf4ff;
          }
        </style>
      </head>
      <body>
        <!-- Version Selector Header -->
        <div class="version-selector-container">
          <div class="version-selector-header">
            <h1 class="version-selector-title">📚 Stampchain API Documentation</h1>
            <div class="version-selector-controls">
              <div class="version-info">
                <span id="current-version-text">API Version:</span>
                <span class="version-badge" id="current-version-badge">v2.3</span>
              </div>
              <div class="version-selector">
                <button class="version-btn" data-version="2.2" id="btn-v22">
                  v2.2
                </button>
                <button class="version-btn active" data-version="2.3" id="btn-v23">
                  v2.3
                  <span class="version-badge" style="margin-left: 8px;">Latest</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Swagger UI Container -->
        <div id="swagger-ui">
          <div style="text-align: center; padding: 40px; color: #666;">
            <div class="loading-spinner"></div>
            <p style="margin-top: 16px;">Loading API Documentation...</p>
          </div>
        </div>

        <!-- Swagger UI Scripts -->
        <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js"></script>
        <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-standalone-preset.js"></script>

        <script>
          class APIVersionSelector {
            constructor() {
              this.currentVersion = '2.3';
              this.ui = null;
              this.isLoading = false;
              this.originalSchema = null;
              this.init();
            }

            init() {
              // Set up event listeners
              document.querySelectorAll('.version-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                  const version = e.target.dataset.version;
                  this.switchVersion(version);
                });
              });

              // Load initial version
              this.loadSwaggerUI(this.currentVersion);
            }

            async switchVersion(version) {
              if (this.isLoading || version === this.currentVersion) return;

              this.isLoading = true;
              this.currentVersion = version;

              // Update UI state
              this.updateVersionButtons(version);
              this.updateVersionBadge(version);
              this.showLoadingState();

              // Load new schema
              await this.loadSwaggerUI(version);

              this.isLoading = false;
            }

            updateVersionButtons(activeVersion) {
              document.querySelectorAll('.version-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.version === activeVersion) {
                  btn.classList.add('active');
                }
              });
            }

            updateVersionBadge(version) {
              const badge = document.getElementById('current-version-badge');
              badge.textContent = \`v\${version}\`;
            }

            showLoadingState() {
              const container = document.getElementById('swagger-ui');
              container.innerHTML = \`
                <div style="text-align: center; padding: 40px; color: #666;">
                  <div class="loading-spinner"></div>
                  <p style="margin-top: 16px;">Loading API v\${this.currentVersion} Documentation...</p>
                </div>
              \`;
            }

            async loadOriginalSchema() {
              if (this.originalSchema) return this.originalSchema;

              try {
                const response = await fetch('swagger/openapi.yml');
                const yamlText = await response.text();
                // Simple YAML to JSON conversion for demo - in production you'd use a proper YAML parser
                this.originalSchema = yamlText;
                return yamlText;
              } catch (error) {
                console.error('Failed to load original schema:', error);
                throw error;
              }
            }

            async loadSwaggerUI(version) {
              try {
                // Load original schema
                await this.loadOriginalSchema();

                // Create version-specific configuration
                const config = this.getVersionConfig(version);

                // Initialize Swagger UI with version-specific settings
                this.ui = SwaggerUIBundle({
                  ...config,
                  dom_id: '#swagger-ui',
                  deepLinking: true,
                  presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                  ],
                  plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                  ],
                  layout: "StandaloneLayout",
                  onComplete: () => {
                    this.addVersionSpecificInfo(version);
                    this.customizeForVersion(version);
                  }
                });

              } catch (error) {
                console.error(\`Failed to load API v\${version} documentation:\`, error);
                this.showErrorState(version, error);
              }
            }

            getVersionConfig(version) {
              const baseConfig = {
                url: "swagger/openapi.yml",
                tryItOutEnabled: true,
                supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
                requestInterceptor: (req) => {
                  // Add version header to all requests
                  req.headers['X-API-Version'] = version;
                  return req;
                }
              };

              if (version === '2.2') {
                return {
                  ...baseConfig,
                  // v2.2 specific configuration
                  docExpansion: 'list',
                  defaultModelsExpandDepth: 1,
                  showExtensions: true,
                  filter: true,
                  // Custom request interceptor for v2.2
                  requestInterceptor: (req) => {
                    req.headers['X-API-Version'] = '2.2';
                    req.headers['API-Version'] = '2.2';
                    return req;
                  }
                };
              } else {
                return {
                  ...baseConfig,
                  // v2.3 specific configuration (latest features)
                  docExpansion: 'none',
                  defaultModelsExpandDepth: 2,
                  showExtensions: true,
                  filter: true,
                  // Custom request interceptor for v2.3
                  requestInterceptor: (req) => {
                    req.headers['X-API-Version'] = '2.3';
                    req.headers['API-Version'] = '2.3';
                    return req;
                  }
                };
              }
            }

            addVersionSpecificInfo(version) {
              // Add version-specific information to the UI
              setTimeout(() => {
                const infoSection = document.querySelector('.swagger-ui .info');
                if (infoSection && !infoSection.querySelector('.version-info-banner')) {
                  const banner = document.createElement('div');
                  banner.className = 'version-info-banner';
                  banner.style.cssText = \`
                    background: linear-gradient(135deg, #8800CC 0%, #AA00FF 100%);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 6px;
                    margin: 16px 0;
                    font-weight: 500;
                  \`;

                  const versionInfo = version === '2.2'
                    ? {
                        text: '🔄 API v2.2 - Legacy endpoints with basic market data',
                        features: ['Root-level price fields (floorPrice, floorPriceUSD)', 'Basic market data integration', 'Backward compatibility maintained', 'Direct field access without nesting'],
                        examples: 'Example: { "stamp": 123, "floorPrice": "0.001", "floorPriceUSD": 45.67 }'
                      }
                    : {
                        text: '🚀 API v2.3 - Latest with enhanced market data structure',
                        features: ['Enhanced marketData object structure', 'Cleaner nested response format', 'Advanced field filtering', 'Improved data organization'],
                        examples: 'Example: { "stamp": 123, "marketData": { "floorPriceBTC": "0.001", "floorPriceUSD": 45.67 } }'
                      };

                  banner.innerHTML = \`
                    <div style="font-size: 16px; margin-bottom: 8px;">\${versionInfo.text}</div>
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">
                      <strong>Key Features:</strong> \${versionInfo.features.join(' • ')}
                    </div>
                    <div style="font-size: 13px; opacity: 0.8; font-family: monospace; background: rgba(0,0,0,0.1); padding: 8px; border-radius: 4px;">
                      \${versionInfo.examples}
                    </div>
                    <div style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
                      💡 All "Try it out" requests will automatically include the X-API-Version: \${version} header
                    </div>
                  \`;

                  infoSection.appendChild(banner);
                }
              }, 1000);
            }

            customizeForVersion(version) {
              // Add version-specific customizations to the UI
              setTimeout(() => {
                // Add badges to endpoints that behave differently between versions
                const operations = document.querySelectorAll('.swagger-ui .opblock');
                operations.forEach(operation => {
                  const summary = operation.querySelector('.opblock-summary');
                  if (summary && !summary.querySelector('.version-badge-endpoint')) {
                    const path = summary.querySelector('.opblock-summary-path')?.textContent;

                    // Add badges for endpoints that have version-specific behavior
                    if (path && (path.includes('/stamps') || path.includes('/src20') || path.includes('/collections'))) {
                      const badge = document.createElement('span');
                      badge.className = 'version-badge-endpoint';
                      badge.style.cssText = \`
                        background: \${version === '2.2' ? '#17a2b8' : '#AA00FF'};
                        color: white;
                        font-size: 10px;
                        padding: 2px 6px;
                        border-radius: 3px;
                        margin-left: 8px;
                        font-weight: 600;
                      \`;
                      badge.textContent = version === '2.2' ? 'v2.2 FORMAT' : 'v2.3 ENHANCED';
                      summary.appendChild(badge);
                    }
                  }
                });

                // Highlight response examples based on version
                const responseContainers = document.querySelectorAll('.swagger-ui .response-col_description');
                responseContainers.forEach(container => {
                  if (!container.querySelector('.version-response-note')) {
                    const note = document.createElement('div');
                    note.className = 'version-response-note';
                    note.style.cssText = \`
                      background: \${version === '2.2' ? '#e7f3ff' : '#fdf4ff'};
                      border: 1px solid \${version === '2.2' ? '#b3d9ff' : '#e4c1ff'};
                      padding: 8px 12px;
                      border-radius: 4px;
                      margin: 8px 0;
                      font-size: 12px;
                      color: #333;
                    \`;
                    note.innerHTML = version === '2.2'
                      ? '📋 <strong>v2.2 Response:</strong> Market data fields appear at root level (floorPrice, floorPriceUSD)'
                      : '✨ <strong>v2.3 Response:</strong> Market data organized in nested marketData object with enhanced structure';
                    container.insertBefore(note, container.firstChild);
                  }
                });
              }, 1500);
            }

            showErrorState(version, error) {
              const container = document.getElementById('swagger-ui');
              container.innerHTML = \`
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                  <h3>❌ Failed to Load API v\${version} Documentation</h3>
                  <p>Error: \${error.message}</p>
                  <button onclick="location.reload()" style="
                    background: #AA00FF;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 16px;
                  ">
                    🔄 Retry
                  </button>
                </div>
              \`;
            }
          }

          // Initialize when page loads
          globalThis.onload = function() {
            new APIVersionSelector();
          };
        </script>
      </body>
      </html>
    `;

    return new Response(htmlContent, {
      headers: { "content-type": "text/html; charset=UTF-8" },
    });
  },
};
