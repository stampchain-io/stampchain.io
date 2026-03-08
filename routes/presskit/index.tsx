/* ===== PRESS KIT PAGE ===== */
import { Button } from "$button";
import { Icon } from "$icon";
import {
  body,
  containerBackground,
  containerGap,
  glassmorphismL2,
} from "$layout";
import {
  labelSm,
  labelXxs,
  subtitleGrey,
  text,
  titleGreyLD,
  value,
  valueSm,
  valueSmLink,
} from "$text";

/* ===== DOWNLOAD BUTTONS (SVG + PNG) ===== */
function DownloadButtons({ inline = false }: { inline?: boolean }) {
  const wrapperClass = inline
    ? "mt-2.5 flex gap-5 justify-center"
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

/* ===== DUMMY IMAGE PLACEHOLDER ===== */
function ImagePlaceholder(
  {
    width = "w-full",
    height = "h-fit",
    label = "",
    showButtons = false,
    icons,
  }: {
    width?: string;
    height?: string;
    label?: string;
    showButtons?: boolean;
    icons?: string[];
  },
) {
  return (
    <div
      class={`${width} ${height} ${glassmorphismL2} flex flex-col items-center justify-center p-5 gap-2.5`}
    >
      {icons
        ? (
          <div class="flex items-center gap-5">
            {icons.map((name) => (
              <Icon
                key={name}
                type="icon"
                name={name}
                weight="light"
                size="custom"
                color="grey"
                className="w-12 h-12"
              />
            ))}
          </div>
        )
        : (
          <svg
            class="w-10 h-10 text-color-grey-semidark opacity-60"
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
      {label && <span class={value}>{label}</span>}
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
  /* ===== COLOR DATA ===== */
  const purpleColors = [
    { color: "purple-dark", hex: "#43005c", name: "Dark" },
    { color: "purple-semidark", hex: "#610085", name: "Semi Dark" },
    { color: "purple", hex: "#7f00ad", name: "Default" },
    { color: "purple-semilight", hex: "#9d00d6", name: "Semi Light" },
    { color: "purple-light", hex: "#BB00FF", name: "Light" },
  ];

  const greyColors = [
    { color: "grey-dark", hex: "#585552", name: "Dark" },
    { color: "grey-semidark", hex: "#817e78", name: "Semi Dark" },
    { color: "grey", hex: "#a8a39d", name: "Default" },
    { color: "grey-semilight", hex: "#d1cbc3", name: "Semi Light" },
    { color: "grey-light", hex: "#f9f2e9", name: "Light" },
  ];

  const bitcoinColors = [
    { color: "black", hex: "#000000", name: "Black" },
    { color: "dark-grey", hex: "#4d4d4d", name: "Dark Grey" },
    { color: "btc-orange", hex: "#ff8800", name: "BTC Orange" },
    { color: "btc-gold", hex: "#F7931A", name: "BTC Gold" },
  ];

  /* ===== RENDER ===== */
  return (
    <div class={`${body} ${containerGap}`}>
      {/* ===== SECTION 1: PRESS KIT INTRO ===== */}
      <section class={containerBackground}>
        <h1 class={titleGreyLD}>PRESS KIT</h1>
        <h2 class={subtitleGrey}>FOR THE BITCOIN STAMPS ECOSYSTEM</h2>
        <p class={text}>
          Brand assets, guidelines, and marketing materials for the Bitcoin
          Stamps protocol and Stampchain, including Stamps and SRC-20 token
          icons.
        </p>
      </section>

      {/* ===== SECTION 2: BITCOIN STAMPS BRANDING ===== */}
      <section class={containerBackground}>
        <h1 class={titleGreyLD}>BITCOIN STAMPS</h1>
        <h2 class={subtitleGrey}>PROTOCOL BRANDING</h2>

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
            class={`flex flex-col gap-4 mobileLg:w-1/2 tablet:w-1/3 ${glassmorphismL2} p-5`}
          >
            <div>
              <h3 class={labelSm}>TYPEFACE</h3>
              <div class="group flex items-center w-fit gap-2.5">
                <a
                  href="https://fonts.google.com/specimen/Open+Sans"
                  target="_blank"
                  rel="noopener noreferrer"
                  class={valueSmLink}
                >
                  OPEN SANS
                </a>
                <Icon
                  type="iconButton"
                  name="share"
                  weight="normal"
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
                    {bitcoinColors.map((c) => (
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
                    {bitcoinColors.map((c) => (
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
            label="Logo Light"
            showButtons
          />
          <ImagePlaceholder
            height="h-28 mobileMd:h-36"
            label="Logo Dark"
            showButtons
          />
          <ImagePlaceholder
            height="h-28 mobileMd:h-36"
            label="Logo Horizontal"
            showButtons
          />
          <ImagePlaceholder
            height="h-28 mobileMd:h-36"
            label="Logo Icon"
            showButtons
          />
        </div>
      </section>

      {/* ===== SECTION 3: STAMPCHAIN WEBSITE LOGO ===== */}
      <section class={containerBackground}>
        <h1 class={titleGreyLD}>STAMPCHAIN</h1>
        <h2 class={subtitleGrey}>WEBSITE LOGO</h2>

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
            class={`flex flex-col gap-4 mobileLg:w-1/2 tablet:w-1/3 ${glassmorphismL2} p-5`}
          >
            <div>
              <h3 class={labelSm}>TYPEFACE</h3>
              <div class="group flex items-center w-fit gap-2.5">
                <a
                  href="https://fonts.google.com/specimen/Work+Sans"
                  target="_blank"
                  rel="noopener noreferrer"
                  class={valueSmLink}
                >
                  WORK SANS
                </a>
                <Icon
                  type="iconButton"
                  name="share"
                  weight="normal"
                  size="xxs"
                  color="custom"
                  className="mb-1 stroke-color-grey-light group-hover:stroke-color-grey transition-colors"
                  href="https://fonts.google.com/specimen/Work+Sans"
                  target="_blank"
                  rel="noopener noreferrer"
                  ariaLabel="Open Work Sans on Google Fonts"
                />
              </div>
            </div>
            <div>
              <h3 class={labelSm}>COLOR PALETTE</h3>
              <div class="flex flex-col gap-4">
                <div>
                  <p class={`${valueSm} mb-1`}>PURPLE</p>
                  <div class="flex justify-between">
                    {purpleColors.map((c) => (
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
                    {greyColors.map((c) => <ColorSwatch key={c.hex} {...c} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stampchain Logo assets */}
        <div
          class={`grid grid-cols-2 mobileLg:grid-cols-4 gap-5 mt-5`}
        >
          <ImagePlaceholder
            height="h-28 mobileMd:h-36"
            label="Logo Light"
            showButtons
          />
          <ImagePlaceholder
            height="h-28 mobileMd:h-36"
            label="Logo Dark"
            showButtons
          />
          <ImagePlaceholder
            height="h-28 mobileMd:h-36"
            label="Logo Horizontal"
            showButtons
          />
          <ImagePlaceholder
            height="h-28 mobileMd:h-36"
            label="Logo Icon"
            showButtons
          />
        </div>
      </section>

      {/* ===== SECTION 4: ART STAMPS & SRC20 TOKENS ===== */}
      <section class={containerBackground}>
        <h1 class={titleGreyLD}>ART STAMPS & SRC20 TOKENS</h1>
        <h2 class={subtitleGrey}>ICONS</h2>
        <p class={text}>
          Iconset 24x24px - stroke width 1.0.
          <br />
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur.
        </p>

        {/* Icon grid */}
        <div
          class={`grid grid-cols-2 gap-5 mt-5`}
        >
          <ImagePlaceholder
            label="STAMP ART"
            showButtons
          />
          <ImagePlaceholder
            icons={["src20Token", "src20Tokens"]}
            label="SRC-20 TOKENS"
            showButtons
          />
        </div>
      </section>

      {/* ===== SECTION 5: STAMP ART ===== */}
      <section class={containerBackground}>
        <h1 class={titleGreyLD}>STAMP ART</h1>
        <h2 class={subtitleGrey}>SELECTED SPECIALS</h2>
        <p class={text}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <p class={text}>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur.
        </p>

        {/* Art gallery grid */}
        <div
          class={`grid grid-cols-2 mobileLg:grid-cols-3 desktop:grid-cols-4 gap-3 mobileMd:gap-5 mt-5`}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <ImagePlaceholder
              key={i}
              width="w-full"
              height="aspect-square"
              label={`Stamp #${i + 1}`}
            />
          ))}
        </div>

        <DownloadButtons />
      </section>

      {/* ===== SECTION 6: STAMP MEMES ===== */}
      <section class={containerBackground}>
        <h1 class={titleGreyLD}>STAMP MEMES</h1>
        <h2 class={subtitleGrey}>LOREM IPSUM</h2>
        <p class={text}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <p class={text}>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur.
        </p>

        {/* Meme grid */}
        <div
          class={`grid grid-cols-2 mobileLg:grid-cols-3 desktop:grid-cols-4 gap-3 mobileMd:gap-5 mt-5`}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <ImagePlaceholder
              key={i}
              width="w-full"
              height="h-36 mobileMd:h-44"
              label={`Meme ${i + 1}`}
            />
          ))}
        </div>

        <DownloadButtons />
      </section>
    </div>
  );
}
