import { titleNeutral } from "$text";

export default function BlockHeader() {
  return (
    <div class="flex items-center justify-between">
      <h1 class={`${titleNeutral} ml-1.5`}>STAMP BLOCK EXPLORER</h1>
    </div>
  );
}
