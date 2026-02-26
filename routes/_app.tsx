/* ===== ROOT APP LAYOUT ROUTE ===== */
import { MetaTags } from "$components/layout/MetaTags.tsx";
import { ResourceHints } from "$components/layout/PerformanceUtils.tsx";
import { Head, Partial } from "$fresh/runtime.ts";
import { type PageProps } from "$fresh/server.ts";
import { Header } from "$header";
import AnimationControlsManager from "$islands/layout/AnimationControlsManager.tsx";
import BackgroundTopology from "$islands/layout/BackgroundTopology.tsx";
import FontLoader from "$islands/layout/FontLoader.tsx";
import ModalProvider from "$islands/layout/ModalProvider.tsx";
import PageVisibilityManager from "$islands/layout/PageVisibilityManager.tsx";
import { NotificationUpdate } from "$islands/Toast/NotificationUpdate.tsx";
import { ToastProvider } from "$islands/Toast/ToastProvider.tsx";
import WebVitalsReporter from "$islands/WebVitalsReporter.tsx";
import { Footer, NavigatorProvider } from "$layout";

/* ===== ROOT COMPONENT ===== */
export default function App({ Component, state, url }: PageProps<unknown>) {
  /* ===== LAYOUT BYPASS CHECK ===== */
  if (state?.skipAppLayout) {
    return <Component />;
  }

  // Check if this is a stamp page that will have its own og:image
  const isStampPage = url.pathname.startsWith("/stamp/");

  /* ===== RENDER ===== */
  return (
    <html
      lang="en"
      data-page-type={isStampPage ? "stamp" : "other"}
      data-pathname={url.pathname}
    >
      {/* ===== HEAD SECTION ===== */}
      <Head>
        {/* ===== META TAGS ===== */}
        <MetaTags
          skipImage={isStampPage}
          skipTitle={isStampPage}
          skipDescription={isStampPage}
          skipOgMeta={isStampPage}
          canonicalUrl={`https://stampchain.io${url.pathname}`}
          ogUrl={`https://stampchain.io${url.pathname}`}
        />

        {/* ===== ENHANCED RESOURCE PRELOADING ===== */}
        <ResourceHints />

        {/* ===== VANTA.JS DEPENDENCIES ===== */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />

        {/* ===== LAZY SCRIPT LOADING COORDINATOR ===== */}
        {/* Inline script to track loading and dispatch event when ready */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Track script loading state
                window.__vantaScripts = { three: false, p5: false, vanta: false };

                // Dispatch event when all scripts are ready
                window.checkVantaReady = function() {
                  if (window.__vantaScripts.three && window.__vantaScripts.p5 && window.__vantaScripts.vanta) {
                    window.dispatchEvent(new CustomEvent('vanta-scripts-ready', {
                      detail: { three: true, p5: true, vanta: true }
                    }));
                  }
                };
              })();
            `,
          }}
        />

        {/* Load scripts with onload handlers embedded in src URLs via wrapper scripts */}
        <script
          async
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var s = document.createElement('script');
                s.async = true;
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                s.onload = function() { window.__vantaScripts.three = true; window.checkVantaReady(); };
                document.head.appendChild(s);
              })();
            `,
          }}
        />
        <script
          async
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var s = document.createElement('script');
                s.async = true;
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js';
                s.onload = function() { window.__vantaScripts.p5 = true; window.checkVantaReady(); };
                document.head.appendChild(s);
              })();
            `,
          }}
        />
        <script
          async
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var s = document.createElement('script');
                s.async = true;
                s.src = '/background-topology.js';
                s.onload = function() { window.__vantaScripts.vanta = true; window.checkVantaReady(); };
                document.head.appendChild(s);
              })();
            `,
          }}
        />

        {/* ===== CRITICAL CSS ===== */}
        <link rel="preload" href="/styles.css" as="style" />
        <link rel="stylesheet" href="/styles.css" />
        <link rel="preload" href="/modal.css" as="style" />
        <link rel="stylesheet" href="/modal.css" />
        <link rel="preload" href="/slick.css" as="style" />
        <link rel="stylesheet" href="/slick.css" />

        {/* ===== FONT LOADING ===== */}
        <FontLoader />

        {/* ===== CRITICAL STYLES ===== */}
        <style>
          {`
            .text-fill-transparent {
              -webkit-text-fill-color: transparent;
            }

            /* Critical text styles */
            .home-header-text {
              text-rendering: optimizeLegibility;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }

            /* Mobile menu is handled with CSS classes in the component */
          `}
        </style>

        {/* ===== FONT FACE DEFINITIONS ===== */}
        <style>
          {`
            @font-face {
              font-family: 'Work Sans';
              font-style: normal;
              font-weight: 700;
              font-display: swap;
            }
            @font-face {
              font-family: 'Work Sans';
              font-style: normal;
              font-weight: 900;
              font-display: swap;
            }
          `}
        </style>

        {/* ===== LOADING SKELETON STYLES ===== */}
        <style>
          {`
            .loading-skeleton {
              background: rgba(23, 20, 23, 0.5);
              border: 1px solid rgba(29, 25, 29, 0.8);
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }

            /* ===== COMPREHENSIVE ANIMATION PERFORMANCE CONTROLS ===== */

            /* Loading skeleton controls */
            .loading-skeleton.paused {
              animation-play-state: paused;
            }

            .loading-skeleton.running {
              animation-play-state: running;
            }

            /* Pause animations when page is hidden (Page Visibility API) */
            .page-hidden .loading-skeleton {
              animation-play-state: paused;
            }

            /* Stop animations when loading is complete */
            .loading-skeleton.completed {
              animation: none;
              background: rgba(23, 20, 23, 0.5);
              border: 1px solid rgba(29, 25, 29, 0.8);
            }

            /* Global animation controls based on page visibility */
            .page-hidden * {
              animation-play-state: paused !important;
            }

            .page-hidden .animate-pulse,
            .page-hidden .animate-spin,
            .page-hidden .animate-bounce,
            .page-hidden .animate-ping {
              animation-play-state: paused !important;
            }

            /* Reduced motion support (accessibility) */
            .reduced-motion *,
            .reduced-motion *::before,
            .reduced-motion *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }

            /* Performance-based animation controls removed */

            /* Intersection observer based controls */
            .animation-paused {
              animation-play-state: paused !important;
            }

            .animation-running {
              animation-play-state: running !important;
            }

            /* Specific component animation controls */
            .page-hidden .swiper-slide,
            .page-hidden .carousel-slider {
              animation-play-state: paused !important;
            }

            .page-hidden .modal-content {
              animation-play-state: paused !important;
            }

            /* Transition optimizations for low performance removed */

            /* Match StampCard grid layout - doesnt apply to StampCardRows */
            .stamp-grid-skeleton {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 1.5rem;
              padding: 1rem;
            }

            .stamp-card-skeleton {
              aspect-ratio: 1;
              border-radius: 1rem; /* rounded-2xl */
            }

            /* Match SRC20Section layout */
            .src20-skeleton {
              height: 120px;
              margin: 1rem 0;
            }

            /* ===== KEYFRAMES ===== */
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.5;
              }
            }

            .content-lazy {
              content-visibility: auto;
              contain-intrinsic-size: 0 500px;
            }
          `}
        </style>

        {/* ===== NON-CRITICAL CSS ===== */}
        <link
          rel="stylesheet"
          href="/carousel.css"
          media="(min-width: 1px)"
        />
        <link
          rel="stylesheet"
          href="/flatpickr.css"
          media="(min-width: 1px)"
        />
      </Head>

      {/* ===== BODY SECTION ===== */}
      <body class="!relative min-h-screen overflow-x-hidden overflow-hidden">
        {/* ===== BACKGROUND ANIMATION===== */}
        <BackgroundTopology />

        {/* ===== MAIN CONTENT WRAPPER ===== */}
        <div class="flex flex-col min-h-screen font-work-sans relative z-[2]">
          {/* ===== PROVIDERS ===== */}
          <ToastProvider>
            <NotificationUpdate />
            <NavigatorProvider>
              <div class="flex flex-col min-h-screen">
                {/* ===== LAYOUT STRUCTURE ===== */}
                <Header />
                <main
                  class="flex flex-col flex-grow w-full max-w-desktop mx-auto px-gutter-mobile mobileLg:px-gutter-tablet tablet:px-gutter-desktop"
                  f-client-nav
                >
                  <Partial name="body">
                    <Component />
                  </Partial>
                </main>
                <Footer />
              </div>
            </NavigatorProvider>
          </ToastProvider>
        </div>

        {/* ===== MODAL LAYER ===== */}
        <ModalProvider />

        {/* ===== PERFORMANCE OPTIMIZATION ===== */}
        <PageVisibilityManager />
        <AnimationControlsManager />
        <WebVitalsReporter />
      </body>
    </html>
  );
}
