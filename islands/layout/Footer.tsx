/* ===== FOOTER COMPONENT ===== */
import { Icon } from "$icon";
import { containerBackground } from "$layout";
import {
  copyright,
  logoPrimary,
  navLinkFooter,
  navLinkFooterOverlay,
  tagline,
} from "$text";
import { useEffect, useState } from "preact/hooks";

/* ===== FOOTER LINK INTERFACE ===== */
interface FooterLink {
  title: string;
  href: string;
  isExternal?: boolean;
  hiddenOnMobile?: boolean;
}

/* ===== NAVIGATION CONFIGURATIONS ===== */
const resourcesLinks: FooterLink[] = [
  { title: "Media", href: "/media" },
  { title: "How-To", href: "/howto" },
  { title: "FAQ", href: "/faq" },
  {
    title: "Press Kit",
    href:
      "https://drive.google.com/drive/folders/18QsMTZ_ZII5FVxuAs2CLFoLdZE3NOdlT",
    isExternal: true,
  },
];

const aboutLinks: FooterLink[] = [
  { title: "About", href: "/about" },
  { title: "Donate", href: "/about#donate" },
  { title: "Contact", href: "/about#contact" },
  { title: "Terms", href: "/termsofservice" },
];

const mobileLinks: FooterLink[] = [
  { title: "About", href: "/about" },
  { title: "Donate", href: "/about#donate" },
  {
    title: "Press Kit",
    href:
      "https://drive.google.com/drive/folders/18QsMTZ_ZII5FVxuAs2CLFoLdZE3NOdlT",
    isExternal: true,
    hiddenOnMobile: true,
  },
  { title: "Terms", href: "/termsofservice" },
];

/* ===== SOCIAL MEDIA CONFIGURATION ===== */
const socialLinks = [
  {
    icon: (
      <Icon
        type="iconButton"
        name="twitter"
        weight="light"
        size="md"
        color="purple"
        href="https://x.com/Stampchain"
        target="_blank"
      />
    ),
  },
  {
    icon: (
      <Icon
        type="iconButton"
        name="telegram"
        weight="light"
        size="md"
        color="purple"
        href="https://t.me/BitcoinStamps"
        target="_blank"
      />
    ),
  },
  {
    icon: (
      <Icon
        type="iconButton"
        name="discord"
        weight="light"
        size="md"
        color="purple"
        href="https://discord.gg/BRYRt4bH"
        target="_blank"
      />
    ),
  },
  {
    icon: (
      <Icon
        type="iconButton"
        name="github"
        weight="light"
        size="md"
        color="purple"
        href="https://github.com/stampchain-io/"
        target="_blank"
      />
    ),
  },
];

/* ===== MAIN FOOTER COMPONENT ===== */
export function Footer() {
  /* ===== COMPONENT RENDER ===== */
  return (
    <footer class="
      flex flex-col tablet:flex-row justify-between max-w-desktop w-full mx-auto
      px-gutter-mobile mobileLg:px-gutter-tablet tablet:px-gutter-desktop
      pt-10 pb-7.5 tablet:pt-15 tablet:pb-10
      gap-2 mobileMd:gap-3 tablet:gap-4
    ">
      {/* ===== MOBILE SMALL CENTER SECTION - MOBILE MEDIUM+ LEFT SECTION ===== */}
      <div
        class={`${containerBackground} !py-3 tablet:flex-row justify-between`}
      >
        <div class="
        flex flex-col mobileMd:flex-row tablet:flex-col w-full
        justify-start mobileMd:justify-between tablet:justify-start
        items-center mobileMd:items-end tablet:items-start gap-1
      ">
          {/* ===== LOGO AND TAGLINE ===== */}
          <div class="flex flex-col">
            <h5
              class={`${logoPrimary} text-center mobileMd:text-left`}
            >
              STAMPCHAIN
              <span class="font-extralight pr-1">
                .IO
              </span>
            </h5>
            <h6
              class={`${tagline} text-center mobileMd:text-left`}
            >
              IMMORTALISED ART - STORED ON BITCOIN
            </h6>
          </div>

          {/* ===== SOCIAL MEDIA ICONS ===== */}
          <div class="flex gap-6 tablet:gap-5 mt-3 mobileMd:mt-0 tablet:mt-3">
            {socialLinks.map((link, index) => (
              <div key={index}>
                {link.icon}
              </div>
            ))}
          </div>
          <div class="hidden tablet:flex w-full  mt-3 mb-1">
            <h6 class={`${copyright}`}>
              <span class="italic">STAMPCHAIN</span> &copy; 2026
            </h6>
          </div>
        </div>

        {/* ===== DESKTOP RIGHT SECTION ===== */}
        <div class={`${navLinkFooterOverlay}`}>
          <div class="hidden tablet:flex flex-row justify-end w-[300px] pt-1">
            {/* ===== RESOURCES LINKS ===== */}
            <div class="flex w-1/2 ">
              <div class="flex flex-col w-full justify-center gap-1">
                {resourcesLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    f-partial={link.isExternal ? "" : link.href}
                    class={`${navLinkFooter}`}
                    target={link.isExternal ? "_blank" : undefined}
                    rel={link.isExternal ? "noopener noreferrer" : undefined}
                  >
                    {link.title}
                  </a>
                ))}
              </div>
            </div>

            {/* ===== ABOUT LINKS  ===== */}
            <div class="flex w-1/2">
              <div class="flex flex-col w-full justify-center gap-1 text-right">
                {aboutLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    f-partial={link.isExternal ? "" : link.href}
                    class={`${navLinkFooter}`}
                    target={link.isExternal ? "_blank" : undefined}
                    rel={link.isExternal ? "noopener noreferrer" : undefined}
                  >
                    {link.title}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* ===== MOBILE BOTTOM ROW SECTION ===== */}
          {/* ===== MIXED LINKS  ===== */}
          <div class="flex tablet:hidden w-full justify-center mobileMd:justify-start mx-auto mt-3 mobileMd:mt-2 mb-2 mobileMd:mb-0 overflow-hidden">
            {/* ===== BASE/MOBILESM: EVENLY DISTRIBUTED LINKS ===== */}
            <div class="flex mobileMd:hidden flex-row flex-wrap w-full justify-center items-center mx-auto gap-6">
              {mobileLinks.filter((link) => !link.hiddenOnMobile).map((
                link,
              ) => (
                <a
                  key={link.href}
                  href={link.href}
                  f-partial={link.isExternal ? "" : link.href}
                  class={`${navLinkFooter}`}
                  target={link.isExternal ? "_blank" : undefined}
                  rel={link.isExternal ? "noopener noreferrer" : undefined}
                >
                  {link.title}
                </a>
              ))}
            </div>

            {/* ===== MOBILEMD+: LEFT/RIGHT GROUPED LAYOUT ===== */}
            <div class="hidden mobileMd:flex flex-row w-full justify-between">
              {/* ===== LEFT ALIGNED LINKS WITH GAP-5 ===== */}
              <div class="flex gap-5">
                {mobileLinks.filter((link) => link.title !== "TERMS").map((
                  link,
                ) => (
                  <a
                    key={link.href}
                    href={link.href}
                    f-partial={link.isExternal ? "" : link.href}
                    class={`${navLinkFooter}`}
                    target={link.isExternal ? "_blank" : undefined}
                    rel={link.isExternal ? "noopener noreferrer" : undefined}
                  >
                    {link.title}
                  </a>
                ))}
              </div>

              {/* ===== RIGHT ALIGNED TERMS LINK AND COPYRIGHT ===== */}
              <div class="flex flex-row items-center text-right gap-5">
                {mobileLinks.filter((link) => link.title === "TERMS").map((
                  link,
                ) => (
                  <a
                    key={link.href}
                    href={link.href}
                    f-partial={link.isExternal ? "" : link.href}
                    class={`${navLinkFooter}`}
                    target={link.isExternal ? "_blank" : undefined}
                    rel={link.isExternal ? "noopener noreferrer" : undefined}
                  >
                    {link.title}
                  </a>
                ))}

                {/* ===== COPYRIGHT SECTION - MOBILEMD + MOBILELG ===== */}
                <h6
                  class={`${copyright} hidden mobileMd:inline tablet:hidden`}
                >
                  <span class="italic">STAMPCHAIN</span> &copy; 2026
                </h6>
              </div>
            </div>
          </div>

          {/* ===== COPYRIGHT SECTION - BASE/MOBILESM ===== */}
          <div class="flex flex-row mobileMd:hidden w-full justify-center  mt-3">
            <h6 class={`${copyright}`}>
              <span class="italic">STAMPCHAIN</span> &copy; 2026
            </h6>
          </div>
          <div class="hidden tablet:flex mt-[18px] justify-end">
            <CounterpartyVersion />
          </div>
        </div>
      </div>
    </footer>
  );
}

function CounterpartyVersion() {
  const [version, setVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const fetchVersion = async () => {
      try {
        const res = await fetch("/api/v2/counterparty/version", {
          headers: { "X-CSRF-Token": "safe" },
        });
        const data = await res.json();
        if (!cancelled) {
          setVersion(data?.version ?? null);
        }
      } catch (_e) {
        if (!cancelled) setVersion(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVersion();

    const interval = globalThis.setInterval(fetchVersion, 24 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      globalThis.clearInterval(interval);
    };
  }, []);

  return (
    <div class={copyright}>
      COUNTERPARTY {loading
        ? <span class="animate-pulse">vXX.X.X</span>
        : version
        ? <>v{version}</>
        : <>v N/A</>}
    </div>
  );
}
