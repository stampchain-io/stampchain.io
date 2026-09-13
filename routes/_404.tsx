/* ===== ERROR 404 PAGE ===== */
import { Button } from "$button";
import { containerBackground } from "$layout";
import { subtitleNeutral, titleNeutral } from "$text";

/* ===== PAGE COMPONENT ===== */
export default function Error404Page() {
  /* ===== RENDER ===== */
  return (
    <>
      <div
        class={`${containerBackground} justify-center items-center`}
      >
        <div class="flex flex-col justify-center items-center">
          <div class={titleNeutral}>WHOOPS</div>
          <div class={subtitleNeutral}>SOMETHING WENT WRONG</div>
        </div>
        <img
          class="w-[240px] mobileMd:w-[300px] mobileLg:w-[280px] tablet:w-[260px] mt-3 mb-5"
          src="/img/placeholder/broken.png"
          alt="Bitcoin Stamps"
        />
        <div class={subtitleNeutral}>SORRY ABOUT THAT</div>
        <div class="flex gap-6 mt-3">
          <Button
            variant="outline"
            color="neutral"
            size="smR"
            href="javascript:history.back()"
          >
            GO BACK
          </Button>
          <Button
            variant="flat"
            color="neutral"
            size="smR"
            href="/home"
            target="_top"
          >
            HOME
          </Button>
        </div>
      </div>
    </>
  );
}
