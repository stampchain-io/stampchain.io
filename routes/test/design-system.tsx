import { Head } from "$fresh/runtime.ts";
import type { ColorSwatchProps } from "$types/ui.d.ts";

function ColorSwatch({ name, bgClass }: ColorSwatchProps) {
  return (
    <div class={`${bgClass} p-6 rounded-2xl`}>
      <div class="text-color-grey-light font-semibold">{name}</div>
      <div class="text-color-grey-light text-sm mt-2 opacity-80">
        {bgClass}
      </div>
    </div>
  );
}

export default function DesignSystem() {
  return (
    <>
      <Head>
        <title>Design System - BTCStamps</title>
      </Head>
      <div class="min-h-screen bg-color-purple-dark p-8">
        <div class="max-w-full mx-auto space-y-12">
          <h1 class="text-4xl font-bold text-color-grey-light">
            Design System
          </h1>

          {/* Colors */}
          <section class="space-y-8">
            <h2 class="text-2xl font-bold text-color-grey-light">
              Colors
            </h2>

            {/* Purple Colors */}
            <div>
              <h3 class="text-xl text-color-grey-light mb-4">
                Purple Colors
              </h3>
              <div class="grid grid-cols-1 tablet:grid-cols-4 gap-4">
                <ColorSwatch
                  name="Purple Default"
                  bgClass="bg-color-purple"
                  color="purple"
                />
                <ColorSwatch
                  name="Purple Light"
                  bgClass="bg-color-purple-light"
                  color="purple-light"
                />
                <ColorSwatch
                  name="Purple Dark"
                  bgClass="bg-color-purple-dark"
                  color="purple-dark"
                />
                <ColorSwatch
                  name="Purple Semi Light"
                  bgClass="bg-color-purple-semilight"
                  color="purple-semilight"
                />
              </div>
            </div>

            {/* Additional Purple Colors */}
            <div>
              <h3 class="text-xl text-color-grey-light mb-4">
                Additional Purple Colors
              </h3>
              <div class="grid grid-cols-1 tablet:grid-cols-4 gap-4">
                <ColorSwatch
                  name="Purple Semi Dark"
                  bgClass="bg-color-purple-semidark"
                  color="purple-semidark"
                />
              </div>
            </div>

            {/* Text Colors */}
            <div>
              <h3 class="text-xl text-color-grey-light mb-4">
                Text Colors
              </h3>
              <div class="grid grid-cols-1 tablet:grid-cols-4 gap-4">
                <ColorSwatch
                  name="Text Primary"
                  bgClass="bg-color-grey"
                  color="text-primary"
                />
                <ColorSwatch
                  name="Text Secondary"
                  bgClass="bg-color-grey-semidark"
                  color="text-secondary"
                />
                <ColorSwatch
                  name="Table Text"
                  bgClass="bg-color-grey-semilight"
                  color="table-text"
                />
                <ColorSwatch
                  name="Search Placeholder"
                  bgClass="bg-color-grey-semilight"
                  color="search-placeholder"
                />
              </div>
            </div>

            {/* Text Gradients */}
            <div>
              <h3 class="text-xl text-color-grey-light mb-4">
                Text Gradients
              </h3>
              <div class="space-y-6 bg-color-purple-semidark p-8 rounded-2xl">
                {/* Primary Gradients */}
                <p class="bg-gradient-to-l color-primary-gradient text-4xl font-bold">
                  Primary Gradient Text DL
                </p>
                <p class="bg-gradient-to-r color-primary-gradient text-4xl font-bold">
                  Primary Gradient Text LD
                </p>

                {/* Neutral Gradients */}
                <p class="bg-gradient-to-l color-neutral-gradient text-4xl font-bold">
                  Neutral Gradient Text DL
                </p>
                <p class="bg-gradient-to-r color-neutral-gradient text-4xl font-bold">
                  Neutral Gradient Text LD
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
