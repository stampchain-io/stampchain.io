import { useSignal } from "@preact/signals";
import { walletContext } from "$client/wallet/wallet.ts";

export default function ProfileClientIsland() {
  const isAuthenticating = useSignal(false);
  const errorMessage = useSignal("");

  const handleSignIn = async () => {
    errorMessage.value = "";
    isAuthenticating.value = true;

    try {
      const address = walletContext.wallet.address;
      if (!address) throw new Error("No wallet address connected.");

      // 1. Fetch challenge
      const challengeRes = await fetch("/api/v2/news/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address })
      });
      if (!challengeRes.ok) throw new Error("Failed to fetch auth challenge.");
      const { message, nonce } = await challengeRes.json();

      // 2. Request wallet signature
      const signature = await walletContext.signMessage(message);

      // 3. Submit signature to issue session
      const loginRes = await fetch("/api/v2/news/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, nonce })
      });

      if (!loginRes.ok) {
         const errData = await loginRes.json();
         throw new Error(errData.error || "Failed to log in.");
      }

      // Reload to trigger the server-side redirect now that the cookie is set
      globalThis.location.reload();
    } catch (e: any) {
      console.error("SIWB Error:", e);
      errorMessage.value = e.message || "Failed to sign in. Please try again.";
      isAuthenticating.value = false;
    }
  };

  return (
    <div class="bg-black border border-slate-800 p-8 flex flex-col items-center justify-center gap-6 shadow-[inset_0_0_20px_rgba(0,0,0,1)] max-w-md w-full text-center">
      <div class="text-orange-500 font-mono text-xl tracking-widest uppercase mb-2 border-b border-orange-500/30 pb-2">
        AUTHENTICATION REQUIRED
      </div>

      <p class="text-slate-400 font-mono text-sm leading-relaxed">
        {walletContext.isConnected
          ? "You must sign a message to prove ownership of your connected address and access your SNN author profile."
          : "You must connect a Web Extension wallet to view your unified Stamp News Network profile and management dashboard."}
      </p>

      {errorMessage.value && (
          <div class="text-red-500 font-mono text-xs w-full bg-red-900/20 py-2 border border-red-900">
            {errorMessage.value}
          </div>
      )}

      {!walletContext.isConnected ? (
        <button
          type="button"
          onClick={() => walletContext.showConnectModal()}
          class="mt-4 px-8 py-3 bg-orange-600 hover:bg-orange-500 text-black font-bold font-mono text-sm tracking-widest uppercase transition-colors"
        >
          [ CONNECT WALLET ]
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSignIn}
          disabled={isAuthenticating.value}
          class="mt-4 px-8 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-black font-bold font-mono text-sm tracking-widest uppercase transition-colors"
        >
          {isAuthenticating.value ? "[ SIGNING IN... ]" : "[ SIGN IN TO SNN ]"}
        </button>
      )}
    </div>
  );
}
