/* ===== MEDIA KIT PAGE ===== */
import { Button } from "$button";
import { Icon } from "$icon";
import {
  body,
  containerBackground,
  containerGap,
  container2,
} from "$layout";
import {
  label,
  labelSm,
  labelXxs,
  subtitleNeutral,
  text,
  textLinkUnderline,
  textSm,
  titleNeutral,
  valueSm,
  valueSmLink,
} from "$text";

/* ===== DOWNLOAD BUTTONS (SVG + PNG) ===== */
function DownloadButtons({ inline = false }: { inline?: boolean }) {
  const wrapperClass = inline
    ? "mt-1 flex gap-5 justify-center"
    : "mt-5 flex gap-5";
  return (
    <div class={wrapperClass}>
      <Button variant="outline" color="grey" size="smR" href="#">
        SVG
      </Button>
      <Button variant="outline" color="grey" size="smR" href="#">
        PNG
      </Button>
    </div>
  );
}

/* ===== IMAGE PLACEHOLDER / LOGO DISPLAY ===== */
function ImagePlaceholder(
  {
    width = "w-full",
    height = "h-full",
    title = "",
    subtitle = "",
    showButtons = false,
    icon,
    img,
    imgSize = "w-10 h-10",
    imgWrapper = "flex flex-wrap items-center justify-center gap-4",
  }: {
    width?: string;
    height?: string;
    title?: string;
    subtitle?: string;
    showButtons?: boolean;
    icon?: string[];
    img?: string[];
    imgSize?: string;
    imgWrapper?: string;
  },
) {
  return (
    <div
      class={`${width} ${height} ${container2} flex flex-col items-center justify-center p-5 gap-2.5`}
    >
      {img
        ? (
          <div class={imgWrapper}>
            {img.map((s) => (
              <img
                key={s}
                src={s}
                alt={title || "Logo"}
                class={imgSize}
              />
            ))}
          </div>
        )
        : icon
        ? (
          <div class="flex items-center gap-5">
            {icon.map((name) => (
              <Icon
                key={name}
                type="icon"
                name={name}
                weight="light"
                size="custom"
                color="grey"
                className="w-8 h-8"
              />
            ))}
          </div>
        )
        : (
          <svg
            class="w-16 h-16 text-color-grey-semidark opacity-60"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      {title && <span class={`mt-1 ${label} text-center`}>{title}</span>}
      {subtitle && <span class={`-mt-2 ${textSm} text-center`}>{subtitle}
      </span>}
      {showButtons && <DownloadButtons inline />}
    </div>
  );
}

/* ===== COLOR SWATCH ===== */
function ColorSwatch(
  { hex, name }: { color: string; hex: string; name: string },
) {
  return (
    <div class="flex flex-col items-center gap-1.5">
      <div
        class={`w-10 h-10
          min-[480px]:w-12 min-[480px]:h-12
          mobileMd:w-14 mobileMd:h-14
          mobileLg:w-9.5 mobileLg:h-9.5
          min-[1080px]:w-10 min-[1080px]:h-10
          min-[1280px]:w-12 min-[1280px]:h-12
          rounded-lg border border-color-border/50`}
        style={{ backgroundColor: hex }}
      />
      <span class={`${labelXxs} text-center leading-tight`}>
        {name}
        <br />
        <span class="font-medium text-color-grey">{hex.toUpperCase()}</span>
      </span>
    </div>
  );
}

/* ===== PAGE COMPONENT ===== */
export default function PressKit() {
  /* ===== COLOR PALETTE DATA ===== */
  const stampchainPurplePalette = [
    { color: "purple-dark", hex: "#43005c", name: "Dark" },
    { color: "purple-semidark", hex: "#610085", name: "Semi Dark" },
    { color: "purple", hex: "#7f00ad", name: "Default" },
    { color: "purple-semilight", hex: "#9d00d6", name: "Semi Light" },
    { color: "purple-light", hex: "#BB00FF", name: "Light" },
  ];

  const stampchainGreyPalette = [
    { color: "grey-dark", hex: "#585552", name: "Dark" },
    { color: "grey-semidark", hex: "#817e78", name: "Semi Dark" },
    { color: "grey", hex: "#a8a39d", name: "Default" },
    { color: "grey-semilight", hex: "#d1cbc3", name: "Semi Light" },
    { color: "grey-light", hex: "#f9f2e9", name: "Light" },
  ];

  const bitcoinStampsOrangePalette = [
    { color: "black", hex: "#000000", name: "Black" },
    { color: "dark-grey", hex: "#4d4d4d", name: "Dark Grey" },
    { color: "btc-orange", hex: "#ff8800", name: "BTC Orange" },
    { color: "btc-gold", hex: "#F7931A", name: "BTC Gold" },
  ];

  const bitcoinStampsPurplePalette = [
    { color: "black", hex: "#000000", name: "Black" },
    { color: "dark-grey", hex: "#4d4d4d", name: "Dark Grey" },
    { color: "purple", hex: "#7f00ad", name: "Default" },
    { color: "purple-light", hex: "#BB00FF", name: "Light" },
  ];

  /* ===== RENDER ===== */
  return (
    <div class={`${body} ${containerGap}`}>
      {/* ===== SECTION 1: MEDIA KIT INTRO ===== */}
      <section class={containerBackground}>
        <h1 class={titleNeutral}>MEDIA KIT</h1>
        <h2 class={`${subtitleNeutral} !whitespace-normal`}>
          FOR THE BITCOIN STAMPS ECOSYSTEM
        </h2>
        <p class={text}>
          Brand assets, guidelines, and marketing material for the Bitcoin
          Stamps protocol and Stampchain website, including Art stamps and
          SRC-20 token icons.
          <br />
          All assets are available in SVG and PNG formats, with different sizes
          and color variants.
        </p>
      </section>

      {/* ===== SECTION 2: BITCOIN STAMPS BRANDING ===== */}
      <section class={containerBackground}>
        <h3 class={titleNeutral}>BITCOIN STAMPS</h3>
        <h4 class={subtitleNeutral}>PROTOCOL BRANDING</h4>

        {/* Split row */}
        <div class="flex flex-col mobileLg:flex-row gap-5 mobileLg:gap-7.5 mt-2">
          {/* Description */}
          <div class="flex flex-col gap-3 mobileLg:w-1/2 tablet:w-2/3">
            <p class={text}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <p class={text}>
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur.
            </p>
          </div>

          {/* Typeface + palette */}
          <div
            class={`flex flex-col gap-4 mobileLg:w-1/2 tablet:w-1/3 ${container2} p-5`}
          >
            <div>
              <h3 class={labelSm}>TYPEFACE</h3>
              <div class="group flex items-center w-fit gap-2.5">
                <a
                  href="https://fonts.google.com/specimen/Open+Sans"
                  target="_blank"
                  rel="noopener noreferrer"
                  class={`${valueSmLink} group-hover:text-color-grey`}
                >
                  OPEN SANS
                </a>
                <Icon
                  type="iconButton"
                  name="share"
                  weight="bold"
                  size="xxs"
                  color="custom"
                  className="mb-1 stroke-color-grey-light group-hover:stroke-color-grey transition-colors"
                  href="https://fonts.google.com/specimen/Open+Sans"
                  target="_blank"
                  rel="noopener noreferrer"
                  ariaLabel="Open Open Sans on Google Fonts"
                />
              </div>
            </div>
            <div>
              <h3 class={labelSm}>COLOR PALETTE</h3>
              <div class="flex flex-col gap-4">
                <div>
                  <p class={`${valueSm} mb-1`}>SATOSHI ORANGE</p>
                  <div class="flex justify-between">
                    {bitcoinStampsOrangePalette.map((c) => (
                      <ColorSwatch
                        key={c.hex}
                        {...c}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p class={`${valueSm} mb-1`}>KEVIN PURPLE</p>
                  <div class="flex justify-between">
                    {bitcoinStampsPurplePalette.map((c) => (
                      <ColorSwatch
                        key={c.hex}
                        {...c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bitcoin Stamps Asset grid */}
        <div
          class={`grid grid-cols-2 mobileLg:grid-cols-4 gap-5 mt-5`}
        >
          <ImagePlaceholder
            height="h-28 mobileMd:h-36"
            title="Logo Light"
            showButtons
          />
          <ImagePlaceholder
            height="h-28 mobileMd:h-36"
            title="Logo Dark"
            showButtons
          />
          <ImagePlaceholder
            height="h-28 mobileMd:h-36"
            title="Logo Horizontal"
            showButtons
          />
          <ImagePlaceholder
            height="h-28 mobileMd:h-36"
            title="Logo Icon"
            showButtons
          />
        </div>
      </section>

      {/* ===== SECTION 3: STAMPCHAIN WEBSITE LOGO ===== */}
      <section class={containerBackground}>
        <h3 class={titleNeutral}>STAMPCHAIN</h3>
        <h4 class={subtitleNeutral}>WEBSITE BRANDING</h4>

        {/* Split row */}
        <div class="flex flex-col mobileLg:flex-row gap-5 mobileLg:gap-7.5 mt-2">
          {/* Description */}
          <div class="flex flex-col gap-3 mobileLg:w-1/2 tablet:w-2/3">
            <p class={text}>
              Stampchain uses a Montserrat typeface, with heavy italic uppercase
              lettering, and a two-tone purple and grey color palette for logo
              branding.
              <br />
              The logo icon is available in outline and fill variants, either as
              a standalone icon or with text.
              <br />
              We offer monotone light and dark color variants, a purple tinted
              gradient, as well as duotone solid or gradient color versions.
              <br />
            </p>
          </div>

          {/* Typeface + palette */}
          <div
            class={`flex flex-col gap-4 mobileLg:w-1/2 tablet:w-1/3 ${container2} p-5`}
          >
            <div>
              <h3 class={labelSm}>TYPEFACE</h3>
              <div class="group flex items-center w-fit gap-2.5">
                <a
                  href="https://fonts.google.com/specimen/Montserrat"
                  target="_blank"
                  rel="noopener noreferrer"
                  class={`${valueSmLink} group-hover:text-color-grey`}
                >
                  MONTSERRAT
                </a>
                <Icon
                  type="iconButton"
                  name="share"
                  weight="bold"
                  size="xxs"
                  color="custom"
                  className="mb-1 stroke-color-grey-light group-hover:stroke-color-grey transition-colors"
                  href="https://fonts.google.com/specimen/Montserrat"
                  target="_blank"
                  rel="noopener noreferrer"
                  ariaLabel="Open Montserrat on Google Fonts"
                />
              </div>
            </div>
            <div>
              <h3 class={labelSm}>COLOR PALETTE</h3>
              <div class="flex flex-col gap-4">
                <div>
                  <p class={`${valueSm} mb-1`}>PURPLE</p>
                  <div class="flex justify-between">
                    {stampchainPurplePalette.map((c) => (
                      <ColorSwatch
                        key={c.hex}
                        {...c}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p class={`${valueSm} mb-1`}>GREY</p>
                  <div class="flex justify-between">
                    {stampchainGreyPalette.map((c) => (
                      <ColorSwatch key={c.hex} {...c} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stampchain Logo assets */}
        <div
          class={`grid grid-cols-1 mobileLg:grid-cols-2 gap-5 mt-5`}
        >
          <ImagePlaceholder
            img={[
              "/img/mediakit/stampchain/stampchain-outline-duotone-solid.svg",
              "/img/mediakit/stampchain/stampchain-outline-duotone-gradient.svg",
              "/img/mediakit/stampchain/stampchain-outline-monotone-gradient.svg",
              "/img/mediakit/stampchain/stampchain-outline-monotone-dark.svg",
              "/img/mediakit/stampchain/stampchain-outline-monotone-light.svg",
              "/img/mediakit/stampchain/stampchain-fill-duotone-solid.svg",
              "/img/mediakit/stampchain/stampchain-fill-duotone-gradient.svg",
              "/img/mediakit/stampchain/stampchain-fill-monotone-gradient.svg",
              "/img/mediakit/stampchain/stampchain-fill-monotone-dark.svg",
              "/img/mediakit/stampchain/stampchain-fill-monotone-light.svg",
            ]}
            imgWrapper="grid grid-cols-5 gap-2.5 mobileMd:gap-4 w-full place-items-center"
            imgSize="w-10 h-10 mobileMd:w-12 mobileMd:h-12 mobileLg:w-10 mobileLg:h-10 tablet:w-12 tablet:h-12"
            title="LOGO ICON"
            showButtons
          />
          <ImagePlaceholder
            img={[
              "/img/mediakit/stampchain/stampchain-outline-duotone-solid-text.svg",
              "/img/mediakit/stampchain/stampchain-fill-duotone-solid-text.svg",
              "/img/mediakit/stampchain/stampchain-outline-duotone-gradient-text.svg",
              "/img/mediakit/stampchain/stampchain-fill-duotone-gradient-text.svg",
              "/img/mediakit/stampchain/stampchain-outline-monotone-gradient-text.svg",
              "/img/mediakit/stampchain/stampchain-fill-monotone-gradient-text.svg",
              "/img/mediakit/stampchain/stampchain-outline-monotone-dark-text.svg",
              "/img/mediakit/stampchain/stampchain-fill-monotone-dark-text.svg",
              "/img/mediakit/stampchain/stampchain-outline-monotone-light-text.svg",
              "/img/mediakit/stampchain/stampchain-fill-monotone-light-text.svg",
            ]}
            imgWrapper="grid grid-cols-2 tablet:px-2.5 gap-x-4 gap-y-5 w-full"
            imgSize="w-full h-auto"
            title="ICON WITH TEXT"
            showButtons
          />
        </div>
      </section>

      {/* ===== SECTION 4: ART STAMPS & SRC20 TOKENS ===== */}
      <section class={containerBackground}>
        <h3 class={titleNeutral}>STAMPS & TOKENS</h3>
        <h4 class={subtitleNeutral}>ICON SET</h4>
        <p class={text}>
          Art stamps icons for single and multiple stamps, and collections.
          Standard or rounded versions available.
          <br />
          Token icon set for single and multiple SRC-20s, and single SRC-101
          tokens.
          <br />
          Inspired by and play well with{" "}
          <a
            href="https://hugeicons.com/"
            target="_blank"
            rel="noopener noreferrer"
            class={textLinkUnderline}
          >
            Hugeicons
          </a>.
          <br /> <br />
          SVG icons are 24x24px, with custom stroke width and color options.
          <br />
          PNG icons are 96x96px, with dark and light theme variants - stroke
          width 1.
        </p>

        {/* Icon grid */}
        <div
          class={`grid grid-cols-2 gap-5 mt-5`}
        >
          <ImagePlaceholder
            icon={["artStamp", "artStamps"]}
            title="ART STAMPS"
            showButtons
          />
          <ImagePlaceholder
            icon={["src20Token", "src20Tokens"]}
            title="SRC-20 TOKENS"
            showButtons
          />
        </div>
      </section>

      {/* ===== SECTIONS 5+6: STAMP ART & MEMES (tablet: half + half) ===== */}
      <div class={`flex flex-col tablet:flex-row ${containerGap} w-full`}>
        <section
          class={`${containerBackground} tablet:w-1/2 tablet:min-w-0`}
        >
          <h5 class={titleNeutral}>STAMP ART</h5>
          <h6 class={subtitleNeutral}>SELECTED SPECIALS</h6>
          <p class={text}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <p class={text}>
            Duis aute irure dolor in reprehenderit in voluptate velit esse
            cillum dolore eu fugiat nulla pariatur.
          </p>

          {/* Art gallery grid */}
          <div
            class={`grid grid-cols-4 mobileLg:grid-cols-6 desktop:grid-cols-8 gap-3 mobileMd:gap-5 mt-5`}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <ImagePlaceholder
                key={i}
                width="w-full"
                height="aspect-square"
                title={`Stamp #${i + 1}`}
              />
            ))}
          </div>

          <DownloadButtons />
        </section>

        <section
          class={`${containerBackground} tablet:w-1/2 tablet:min-w-0`}
        >
          <h5 class={titleNeutral}>STAMP MEMES</h5>
          <h6 class={subtitleNeutral}>LOREM IPSUM</h6>
          <p class={text}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <p class={text}>
            Duis aute irure dolor in reprehenderit in voluptate velit esse
            cillum dolore eu fugiat nulla pariatur.
          </p>

          {/* Meme grid */}
          <div
            class={`grid grid-cols-4 mobileLg:grid-cols-6 desktop:grid-cols-8 gap-3 mobileMd:gap-5 mt-5`}
          >
            {Array.from({ length: 6 }, (_, i) => (
              <ImagePlaceholder
                key={i}
                width="w-full"
                height="h-36 mobileMd:h-44"
                title={`Meme ${i + 1}`}
              />
            ))}
          </div>

          <DownloadButtons />
        </section>
      </div>
    </div>
  );
}
