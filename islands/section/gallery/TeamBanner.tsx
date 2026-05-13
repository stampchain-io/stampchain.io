/* ===== TEAM GALLERY COMPONENT ===== */
import { containerBackground, containerGap } from "$layout";
import { headingGreyLD, subtitleNeutral, valueSm } from "$text";

/* ===== COMPONENT ===== */
export default function TeamBanner() {
  /* ===== RENDER ===== */
  return (
    <>
      <section class={containerBackground}>
        {/* ===== TEAM SECTION CONTAINER ===== */}
        <div class="w-full flex justify-start items-start">
          <div class="w-full">
            {/* ===== SECTION TITLE ===== */}
            <h2 class={subtitleNeutral}>THE TEAM</h2>

            {/* ===== TEAM MEMBERS GRID ===== */}
            <div
              class={`flex justify-between items-start
             mx-0 mobileLg:mx-12 desktop:mx-16 mt-4
              ${containerGap}`}
            >
              {/* ===== MIKE IN SPACE CARD ===== */}
              <div class="flex flex-col items-center">
                <img src="/img/profile/mike.png" />
                <h5 class={`${headingGreyLD} pt-2`}>
                  MIKE IN SPACE
                </h5>
                <h6 class={`${valueSm} !text-color-grey`}>
                  CODE{" "}
                  <span class="mobileMd:hidden">
                    <br />
                  </span>
                  CONOISSEUR
                </h6>
              </div>

              {/* ===== REINAMORA CARD ===== */}
              <div class="flex flex-col items-center">
                <img src="/img/profile/kevin.png" />
                <h5 class={`${headingGreyLD} pt-2`}>
                  REINAMORA
                </h5>
                <h6 class={`${valueSm} !text-color-grey`}>
                  BACKEND{" "}
                  <span class="mobileMd:hidden">
                    <br />
                  </span>
                  BIGBRAINS
                </h6>
              </div>

              {/* ===== ARWYN CARD ===== */}
              <div class="flex flex-col items-center">
                <img src="/img/profile/arwyn.png" />
                <h5 class={`${headingGreyLD} pt-2`}>
                  ARWYN
                </h5>
                <h6 class={`${valueSm} !text-color-grey`}>
                  MEMETIC{" "}
                  <span class="mobileMd:hidden">
                    <br />
                  </span>MASTER
                </h6>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
