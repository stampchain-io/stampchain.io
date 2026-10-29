/* ===== PAGE SECTIONS ===== */
/* ===== FEE CALCULATORS ===== */
export { FeeCalculatorBase } from "$islands/section/FeeCalculatorBase.tsx";

/* ===== GALLERIES ===== */
export { default as CollectionGallery } from "$islands/section/gallery/CollectionGallery.tsx";
export { default as CollectionGalleryBanner } from "$islands/section/gallery/CollectionGalleryBanner.tsx";
export * from "$islands/section/gallery/SRC20Gallery.tsx";
export { default as StampGallery } from "$islands/section/gallery/StampGallery.tsx";
export * from "$islands/section/gallery/StampGalleryHome.tsx";

/* ===== CAROUSEL ===== */
export * from "$components/section/gallery/CarouselHome.tsx";
export { default as CarouselGallery } from "$islands/section/gallery/Carousel.tsx";
export { default as SwiperStyles } from "$islands/section/gallery/SwiperStyles.tsx";

/* ===== BANNER IMAGES ===== */
export * from "$components/section/gallery/CollectionsBanner.tsx";
export * from "$islands/section/gallery/PartnersBanner.tsx";
export { default as TeamBanner } from "$islands/section/gallery/TeamBanner.tsx";

/* ===== RECENT/LATEST ===== */
export { default as SRC20DeploysGallery } from "$islands/section/gallery/SRC20Deploys.tsx";
export { default as SRC20MintsGallery } from "$islands/section/gallery/SRC20Mints.tsx";
export { default as SRC20TransfersGallery } from "$islands/section/gallery/SRC20Transfers.tsx";
export * from "$islands/section/gallery/StampListings.tsx";
export * from "$islands/section/gallery/StampSales.tsx";
export { default as StampSendsGallery } from "$islands/section/gallery/StampSends.tsx";
/* export { default as SRC101RegistersGallery } from "$islands/section/gallery/SRC101Registers.tsx"; */

/* ===== HOW TO ===== */
export * from "$islands/section/howto/StampingHowto.tsx";
export * from "$islands/section/howto/StampSendHowTo.tsx";
/* ===== HOW TO BASE TEMPLATES ===== */
export * from "$components/section/howto/ArticleBase.tsx";
export * from "$components/section/howto/ArticlesOverviewBase.tsx";
export * from "$components/section/howto/AuthorBase.tsx";
export * from "$components/section/howto/data.ts";
export * from "$components/section/howto/ListBase.tsx";
export type { ListProps } from "$types/ui.d.ts";

/* ===== CTA ===== */
export { default as GetStampingCta } from "$islands/section/cta/GetStampingCta.tsx";
export * from "$islands/section/cta/RecursiveContactCta.tsx";
export * from "$islands/section/cta/StampchainContactCta.tsx";
export * from "$islands/section/cta/StampPoshCta.tsx";
/* I have no idea why, but these two files cannot be barrel exported */
/* It breaks the display of the tools */
/* Direct path import in /routes/about/index.tsx instead */
/* export * from "$islands/section/cta/DonateCta.tsx"; */
/* export * from "$islands/section/cta/ContactCta.tsx"; */
