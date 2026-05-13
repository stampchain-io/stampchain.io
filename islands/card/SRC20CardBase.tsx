/* ===== SRC20 CARD BASE COMPONENT ===== */
/*@baba-check styles*/
import { cellAlign } from "$components/layout/types.ts";
import { glassmorphism, shadowGlowPurple } from "$layout";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import type { SRC20CardBaseProps } from "$types/ui.d.ts";
import { useState } from "preact/hooks";

/* ===== HELPER FUNCTIONS ===== */
function splitTextAndEmojis(text: string): { text: string; emoji: string } {
  // Regex to match emojis
  const emojiRegex =
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;

  // Find the first emoji's position
  const match = text.match(emojiRegex);
  if (!match) return { text, emoji: "" };

  const emojiIndex = text.indexOf(match[0]);
  return {
    text: text.slice(0, emojiIndex),
    emoji: text.slice(emojiIndex),
  };
}

/* ===== COMPONENT ===== */
export function SRC20CardBase({
  src20,
  fromPage: _fromPage = "src20",
  timeframe: _timeframe = "24H",
  onImageClick,
  children,
  totalColumns,
}: SRC20CardBaseProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Early return if src20 is null or undefined
  if (!src20) {
    return null;
  }

  // Use centralized image URL logic
  const imageUrl = getSRC20ImageSrc(src20);

  return (
    <tr
      class={`${glassmorphism} !rounded-2xl border-2 border-transparent hover:border-color-purple-light ${shadowGlowPurple} p-12`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <td class={cellAlign(0, totalColumns ?? 1)}>
        <div class="flex items-center gap-4 p-3">
          <img
            src={imageUrl}
            class="w-8 h-8 rounded cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              if (imageUrl) onImageClick?.(imageUrl);
            }}
            alt={unicodeEscapeToEmoji(src20.tick)}
          />
          <div class="flex flex-col">
            <div class="font-bold text-base uppercase tracking-wide">
              {(() => {
                const { text, emoji } = splitTextAndEmojis(
                  unicodeEscapeToEmoji(src20.tick),
                );
                return (
                  <>
                    {text && (
                      <span
                        class={isHovered
                          ? "text-color-purple-light"
                          : "bg-gradient-to-l color-neutral-gradient"}
                      >
                        {text.toUpperCase()}
                      </span>
                    )}
                    {emoji && <span class="emoji-ticker">{emoji}</span>}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </td>
      {/* Other cells rendered by children */}
      {children}
    </tr>
  );
}

/* Social Links Component - To be implemented when needed
const SocialLinks = ({ src20 }: { src20: SRC20Row }) => {
  return (
    <div class="flex gap-2 items-center">
      {src20.email && (
        <Icon
          type="iconButton"
          name="email"
          weight="normal"
          size="xxs"
          color="greyLight"
          href={src20.email}
          target="_blank"
        />
      )}
      {src20.web && (
        <Icon
          type="iconButton"
          name="website"
          weight="normal"
          size="xxs"
          color="greyLight"
          href={src20.web}
          target="_blank"
        />
      )}
      {src20.tg && (
        <Icon
          type="iconButton"
          name="telegram"
          weight="normal"
          size="xxs"
          color="greyLight"
          href={src20.tg}
        />
      )}
      {src20.x && (
        <Icon
          type="iconButton"
          name="twitter"
          weight="normal"
          size="xxs"
          color="greyLight"
          href={src20.x}
          target="_blank"
        />
      )}
    </div>
  );
};
*/
