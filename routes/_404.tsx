/* ===== ERROR 404 PAGE ===== */
import { Button } from "$button";
import { Head } from "$fresh/runtime.ts";
import { containerBackground } from "$layout";
import { subtitleNeutral, titleNeutralLD } from "$text";

/* ===== PAGE COMPONENT ===== */
export default function Error404Page() {
  /* ===== RENDER ===== */
  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>

      <div
        class={`${containerBackground} mobileMd:max-w-[420px] mobileMd:mx-auto justify-center items-center`}
      >
        <div class="flex flex-col justify-center items-center">
          <div class={titleNeutralLD}>WHOOPS</div>
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
            color="grey"
            size="mdR"
            href="javascript:history.back()"
          >
            GO BACK
          </Button>
          <Button
            variant="flat"
            color="grey"
            size="mdR"
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
