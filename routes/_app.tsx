/* ===== ROOT APP LAYOUT ROUTE ===== */
import { MetaTags } from "$components/layout/MetaTags.tsx";
import { ResourceHints } from "$components/layout/PerformanceUtils.tsx";
import { asset, Head, Partial } from "$fresh/runtime.ts";
import { type PageProps } from "$fresh/server.ts";
import { Header } from "$header";
import AnimationControlsManager from "$islands/layout/AnimationControlsManager.tsx";
import BackgroundTopology from "$islands/layout/BackgroundTopology.tsx";
import ModalProvider from "$islands/layout/ModalProvider.tsx";
import PageVisibilityManager from "$islands/layout/PageVisibilityManager.tsx";
import { NotificationUpdate } from "$islands/Toast/NotificationUpdate.tsx";
import { ToastProvider } from "$islands/Toast/ToastProvider.tsx";
import WebVitalsReporter from "$islands/WebVitalsReporter.tsx";
import { Footer, NavigatorProvider } from "$layout";
import { getPageMetadata } from "$lib/utils/pageMetadata.ts";

/* ===== ROOT COMPONENT ===== */
export default function App({ Component, state, url }: PageProps<unknown>) {
  /* ===== LAYOUT BYPASS CHECK ===== */
  if (state?.skipAppLayout) {
    return <Component />;
  }

  // Check if this is a stamp page that will have its own og:image
  const isStampPage = url.pathname.startsWith("/stamp/");

  /* Per-route <title> and description. Without this every route rendered the
    MetaTags default ("Bitcoin Stamps"), so all 41 routes shipped an identical
    title and search results could not tell the FAQ from the explorer. */
  const pageMeta = getPageMetadata(url.pathname);

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
          title={pageMeta.title}
          description={pageMeta.description}
          skipImage={isStampPage}
          skipTitle={isStampPage}
          skipDescription={isStampPage}
          skipOgMeta={isStampPage}
          canonicalUrl={`https://stampchain.io${url.pathname}`}
          ogUrl={`https://stampchain.io${url.pathname}`}
        />

        {/* ===== ENHANCED RESOURCE PRELOADING ===== */}
        <ResourceHints />

        {/* ===== CRITICAL CSS ===== */}
        {
          /* asset() appends the Fresh build id (?__frsh_c=...), so a deploy that
            changes Tailwind output is picked up immediately. Without it these
            URLs are static and Cloudflare serves them with max-age=691200 —
            eight days of stale CSS for returning visitors, which is not purged
            by deploy.sh (it only purges /_frsh/ and /_fresh/) and not purged at
            all by production-deploy.yml. Fresh already does this automatically
            for <img src>, which is why images never showed the problem. */
        }
        <link rel="preload" href={asset("/styles.css")} as="style" />
        <link rel="stylesheet" href={asset("/styles.css")} />
        <link rel="preload" href={asset("/modal.css")} as="style" />
        <link rel="stylesheet" href={asset("/modal.css")} />
        <link rel="preload" href={asset("/slick.css")} as="style" />
        <link rel="stylesheet" href={asset("/slick.css")} />

        {/* ===== FONT LOADING ===== */}
        {
          /* Emitted as plain <head> markup, not an island. Fresh does not
            hydrate islands rendered from _app.tsx, so <FontLoader /> here
            produced no output at all and Montserrat never loaded — every
            font-montserrat / font-sans class silently fell back to the
            system sans-serif. */
        }
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
        />

        {/* ===== CRITICAL STYLES ===== */}
        <style>
          {`
            /* Critical text styles */
            .home-header-text {
              text-rendering: optimizeLegibility;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }

            /* Mobile menu is handled with CSS classes in the component */
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
          href={asset("/carousel.css")}
          media="(min-width: 1px)"
        />
        <link
          rel="stylesheet"
          href={asset("/flatpickr.css")}
          media="(min-width: 1px)"
        />
      </Head>

      {/* ===== BODY SECTION ===== */}
      <body class="!relative min-h-screen overflow-x-hidden overflow-hidden">
        {/* ===== BACKGROUND ANIMATION===== */}
        <BackgroundTopology />

        {/* ===== MAIN CONTENT WRAPPER ===== */}
        <div class="flex flex-col min-h-screen font-montserrat relative z-[2]">
          {/* ===== PROVIDERS ===== */}
          <ToastProvider>
            <NotificationUpdate />
            <NavigatorProvider>
              <div class="flex flex-col min-h-screen">
                {/* ===== LAYOUT STRUCTURE ===== */}
                <Header />
                <main
                  class="flex flex-col flex-grow w-full max-w-desktop mx-auto px-shell-mobile mobileLg:px-shell-tablet tablet:px-shell-desktop"
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
