import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { walletContext } from "$client/wallet/wallet.ts";

export default function PublishPortalIsland() {
  const title = useSignal("");
  const bodyText = useSignal("");
  const transmitLock = useSignal(false);
  const actionStatus = useSignal<
    "idle" | "constructing" | "signing" | "broadcasting" | "success" | "error"
  >("idle");
  const errorMessage = useSignal("");

  const burnerWif = useSignal("");
  const burnerAddress = useSignal("");
  const burnerFunded = useSignal(false);
  const checkingFundStatus = useSignal(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedWif = localStorage.getItem("snn_burner_wif");
      const savedAddress = localStorage.getItem("snn_burner_address");
      if (savedWif && savedAddress) {
        burnerWif.value = savedWif;
        burnerAddress.value = savedAddress;
      }
    }
  }, []);

  const generateBurner = async () => {
    errorMessage.value = "";
    try {
      const res = await fetch("/api/v2/news/auth/burner/generate");
      if (!res.ok) throw new Error("Failed to generate burner.");
      const data = await res.json();
      burnerWif.value = data.wif;
      burnerAddress.value = data.address;
      
      if (typeof window !== "undefined") {
        localStorage.setItem("snn_burner_wif", data.wif);
        localStorage.setItem("snn_burner_address", data.address);
      }
    } catch(e: any) {
      errorMessage.value = e.message;
    }
  };

  const checkBurnerFunding = async () => {
    if (!burnerAddress.value) return;
    try {
      checkingFundStatus.value = true;
      
      const res = await fetch(`/api/v2/news/auth/burner/status?address=${burnerAddress.value}`);
      if (!res.ok) throw new Error("Failed to check funding.");
      
      const data = await res.json();
      if (data.hasutxos && data.balanceSats > 3500) {
         burnerFunded.value = true;
         errorMessage.value = "";
      } else {
         errorMessage.value = `Address has ${data.balanceSats} sats. Minimum ~3500 sats needed.`;
      }
    } catch(e: any) {
      errorMessage.value = e.message;
    } finally {
      checkingFundStatus.value = false;
    }
  };

  const publishBurner = async () => {
     try {
         errorMessage.value = "";
         actionStatus.value = "constructing";
         
         const res = await fetch("/api/v2/news/auth/burner/publish", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ wif: burnerWif.value, text: generatedPayload.value })
         });
         
         if (!res.ok) {
             const err = await res.json();
             throw new Error(err.error || "Broadcast failed.");
         }
         
         const data = await res.json();
         actionStatus.value = "success";
         errorMessage.value = `Burner Publish Success! TXID: ${data.txid}`;
         
         burnerWif.value = "";
         burnerAddress.value = "";
         
         if (typeof window !== "undefined") {
           localStorage.removeItem("snn_burner_wif");
           localStorage.removeItem("snn_burner_address");
         }
     } catch(e: any) {
         actionStatus.value = "error";
         errorMessage.value = e.message;
     }
  };

  // Construct JSON representation of the post
  const generatedPayload = useComputed(() => {
    if (transmitLock.value) {
      return "LOCK";
    }
    const cleanTitle = title.value.trim().replace(/"/g, '\\"');
    const cleanBody = bodyText.value.trim().replace(/"/g, '\\"');
    if (!cleanTitle && !cleanBody) return "";
    return `{"title":"${cleanTitle}","body":"${cleanBody}"}`;
  });

  // Calculate hex string representation needed for Counterparty API
  const payloadHex = useComputed(() => {
    if (!generatedPayload.value) return "";
    let hex = "";
    for (let i = 0; i < generatedPayload.value.length; i++) {
      hex += generatedPayload.value.charCodeAt(i).toString(16);
    }
    return hex;
  });

  // Example Counterparty CLI representation
  const generatedCommand = useComputed(() => {
    if (!generatedPayload.value) {
      return "counterparty-client broadcast \\\n  --source <INPUT_YOUR_ADDRESS> \\\n  --text '<INPUT>' --value -1";
    }

    return `counterparty-client broadcast \\
  --source <INPUT_YOUR_ADDRESS> \\
  --text '${generatedPayload.value}' \\
  --value -1`;
  });

  const handlePublish = async () => {
    errorMessage.value = "";

    if (!walletContext.isConnected) {
      walletContext.showConnectModal();
      return;
    }

    if (!generatedPayload.value) {
      errorMessage.value = "Cannot publish an empty payload.";
      return;
    }

    try {
      actionStatus.value = "constructing";

      // Request PSBT construction from backend
      const res = await fetch("/api/v2/news/auth/construct-publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: walletContext.wallet.address,
          text: generatedPayload.value,
          satsPerVB: 15,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to construct PSBT");
      }

      const { psbtHex, inputsToSign } = await res.json();

      actionStatus.value = "signing";

      // Sign with Stampchain Wallet Context
      const signedResult = await walletContext.signPSBT(
        walletContext.wallet,
        psbtHex,
        inputsToSign,
        false,
      );

      if (!signedResult.signed || !signedResult.psbt) {
        throw new Error(
          signedResult.error || "User rejected transaction signing.",
        );
      }

      actionStatus.value = "broadcasting";

      // Broadcast to mempool
      const txid = await walletContext.broadcastPSBT(signedResult.psbt);

      if (!txid || typeof txid !== "string") {
        throw new Error("Failed to broadcast transaction.");
      }

      actionStatus.value = "success";
      errorMessage.value = "Successfully published to the mempool! TXID: " +
        txid;
    } catch (e: any) {
      console.error("[Publish Portal] Error publishing:", e);
      errorMessage.value = e.message ||
        "An unknown error occurred during publishing.";
      actionStatus.value = "error";
    }
  };

  const handleConnectWallet = () => {
    walletContext.showConnectModal();
  };

  return (
    <div class="flex flex-col gap-6">
      {/* Input Form */}
      <div class="bg-black border border-slate-800 p-6 flex flex-col gap-4 font-sans text-slate-200 shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
        <h2 class="text-orange-500 font-mono text-xl uppercase tracking-widest border-b border-orange-500/30 pb-2">
          New Broadcast
        </h2>

        <div class="flex flex-col gap-2">
          <label class="font-mono text-xs tracking-widest text-slate-400">
            ARTICLE TITLE
          </label>
          <input
            type="text"
            value={title.value}
            onInput={(e: any) => title.value = e.target.value}
            disabled={transmitLock.value ||
              actionStatus.value !== "idle" && actionStatus.value !== "error"}
            placeholder="e.g. BTC ETF APPROVED"
            class="bg-slate-900 border border-slate-700 px-4 py-3 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors font-bold text-lg disabled:opacity-50"
            maxLength={100}
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="font-mono text-xs tracking-widest text-slate-400">
            BODY CONTENT (PROTOCOL SIZE LIMITS APPLY)
          </label>
          <textarea
            value={bodyText.value}
            onInput={(e: any) => bodyText.value = e.target.value}
            disabled={transmitLock.value ||
              actionStatus.value !== "idle" && actionStatus.value !== "error"}
            placeholder="Markdown supported..."
            class="bg-slate-900 border border-slate-700 px-4 py-3 placeholder-slate-600 min-h-[160px] resize-y focus:outline-none focus:border-orange-500 transition-colors text-sm disabled:opacity-50"
            maxLength={1000}
          />
          <div class="text-right font-mono text-[10px] text-slate-500 mt-1">
            {bodyText.value.length} / 1000 CHARACTERS
          </div>
        </div>
      </div>

      {/* Protocol Configuration & Summary */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mx-auto">
        <div class="bg-black border border-slate-800 p-6 flex flex-col gap-4 shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
          <h2 class="text-orange-500 font-mono text-sm tracking-widest uppercase mb-2 border-b border-slate-800 pb-2">
            Configuration
          </h2>

          <label class="flex items-start gap-4 cursor-pointer p-4 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 transition-colors group">
            <input
              type="checkbox"
              class="w-5 h-5 mt-0.5 accent-orange-500 bg-black border-slate-700 cursor-pointer"
              checked={transmitLock.value}
              onChange={(e: any) => transmitLock.value = e.target.checked}
            />
            <div class="flex flex-col gap-1">
              <span class="font-mono text-sm text-slate-200 group-hover:text-red-400 transition-colors">
                PROFILE LOCK (PERMANENT)
              </span>
              <span class="text-xs text-slate-500 font-sans leading-relaxed">
                Checking this box ignores the article above and transmits text="LOCK". This permanently freezes your SNN author profile. You will never be able to update your underlying SRC-101 display name or avatar again. Only use this if you want to permanently cement your identity.
              </span>
            </div>
          </label>

          <div class="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2 text-xs font-mono">
            <div class="flex justify-between items-center text-slate-400">
              <span>BROADCAST TYPE:</span>
              <span class="text-orange-400">
                {transmitLock.value ? "IMMUTABLE LOCK" : "JSON PAYLOAD"}
              </span>
            </div>
            <div class="flex justify-between items-center text-slate-400">
              <span>COUNTERPARTY VALUE:</span>
              <span class="text-orange-400 font-bold">-1</span>
            </div>
          </div>
        </div>

        <div class="bg-black border border-slate-800 p-6 flex flex-col gap-4 sm:overflow-auto shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
          <h2 class="text-orange-500 font-mono text-sm tracking-widest uppercase mb-2 border-b border-slate-800 pb-2">
            Technical Preview
          </h2>

          <div class="flex flex-col gap-4">
            <div>
              <div class="text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-widest">
                RAW PAYLOAD (HEX)
              </div>
              <div class="bg-slate-900 border border-slate-800 p-3 font-mono text-xs text-green-500 overflow-x-auto break-all min-h-[44px]">
                {payloadHex.value || "WAITING FOR INPUT..."}
              </div>
            </div>

            <div>
              <div class="text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-widest">
                GENERATED CLI COMMAND
              </div>
              <div class="bg-slate-900 border border-slate-800 p-3 font-mono text-[10px] text-slate-400 overflow-hidden text-ellipsis whitespace-pre-wrap select-all focus:outline-none focus:ring-1 focus:ring-orange-500">
                {generatedCommand.value}
              </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-slate-800">
              <div class="text-[10px] text-orange-500 font-mono mb-2 uppercase tracking-widest font-bold">
                MANUAL / FREEWALLET PUBLISH
              </div>
              <div class="text-xs text-slate-400 font-sans leading-relaxed flex flex-col gap-2">
                <p>Don't want to connect a browser wallet? You can publish anonymously via FreeWallet:</p>
                <ol class="list-decimal list-inside space-y-1 ml-1 text-slate-300">
                  <li>Open FreeWallet &rarr; Address Actions &rarr; Broadcast.</li>
                  <li>Paste the JSON payload directly into the "Message" field.</li>
                  <li>Set the Counterparty Value strictly to <strong>-1</strong>.</li>
                </ol>
                <div class="mt-2 bg-slate-900 border border-slate-800 p-3 flex justify-between items-center group relative cursor-pointer" onClick={() => { navigator.clipboard.writeText(generatedPayload.value); }}>
                  <code class="font-mono text-[10px] text-green-400 select-all overflow-hidden text-ellipsis whitespace-nowrap mr-4">
                    {generatedPayload.value || "WAITING FOR INPUT..."}
                  </code>
                  <span class="text-[10px] font-mono text-slate-500 group-hover:text-orange-500 uppercase tracking-widest shrink-0">Click to Copy JSON</span>
                </div>
              </div>
            </div>

            {/* Burner Wallet Publisher */}
            <div class="mt-4 pt-4 border-t border-slate-800">
              <div class="text-[10px] text-green-500 font-mono mb-2 uppercase tracking-widest font-bold">
                100% ANONYMOUS BURNER WALLET
              </div>
              <div class="text-xs text-slate-400 font-sans leading-relaxed flex flex-col gap-2">
                <p>Generate a one-time wallet in the browser, send sats to it, and the server will broadcast your message autonomously using its private keys, protecting your identity.</p>
                
                {!burnerAddress.value ? (
                  <button 
                    type="button" 
                    onClick={generateBurner}
                    class="mt-2 w-full px-4 py-2 border border-green-500 text-green-500 hover:bg-green-500/10 uppercase tracking-widest text-[10px] font-bold transition-colors"
                  >
                    Generate Single-Use Burner
                  </button>
                ) : (
                  <div class="flex flex-col gap-2 p-3 bg-black border border-slate-700">
                    <div class="flex justify-between items-center text-[10px] font-mono border-b border-slate-800 pb-2">
                      <span class="text-orange-500 font-bold uppercase">Funding Target</span>
                      <span class="text-slate-400">~4,000 SATS</span>
                    </div>
                    <div class="text-[10px] uppercase font-mono text-slate-500 mt-2 tracking-widest text-center">Send to:</div>
                    <div class="bg-slate-900 border border-slate-800 p-2 text-center text-orange-400 font-mono text-xs select-all break-all">
                      {burnerAddress.value}
                    </div>
                    
                    {!burnerFunded.value ? (
                       <button 
                         type="button" 
                         onClick={checkBurnerFunding}
                         disabled={checkingFundStatus.value || !generatedPayload.value}
                         class="mt-2 w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 uppercase tracking-widest text-[10px] font-bold transition-colors"
                       >
                         {checkingFundStatus.value ? "Checking mempool..." : "Check For Funds"}
                       </button>
                    ) : (
                       <button
                         type="button"
                         onClick={publishBurner}
                         disabled={!generatedPayload.value || actionStatus.value !== "idle" && actionStatus.value !== "error"}
                         class="mt-2 w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-black uppercase tracking-widest text-[10px] font-bold transition-colors"
                       >
                         {actionStatus.value === "idle" || actionStatus.value === "error" ? "Broadcast Anonymously" : "Broadcasting..."}
                       </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div class="flex flex-col gap-4 mt-6">
        {errorMessage.value && (
          <div class="bg-red-900/20 border border-red-500/50 p-4 font-mono text-sm text-red-400 text-center">
            {errorMessage.value}
          </div>
        )}

        {actionStatus.value === "success" && (
          <div class="bg-green-900/20 border border-green-500/50 p-4 font-mono text-sm text-green-400 text-center">
            {errorMessage.value}
          </div>
        )}

        <div class="flex justify-center items-center gap-4">
          {!walletContext.isConnected
            ? (
              <button
                type="button"
                onClick={handleConnectWallet}
                class="w-full md:w-auto px-8 py-4 bg-orange-600 hover:bg-orange-500 text-black font-bold font-mono text-sm tracking-widest uppercase transition-colors"
              >
                [ CONNECT NATIVE WALLET ]
              </button>
            )
            : (
              <button
                type="button"
                onClick={handlePublish}
                disabled={!generatedPayload.value ||
                  actionStatus.value !== "idle" &&
                    actionStatus.value !== "error"}
                class="w-full md:w-auto px-12 py-4 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold font-mono text-sm tracking-widest uppercase transition-colors"
              >
                {actionStatus.value === "idle" || actionStatus.value === "error"
                  ? "SIGN & BROADCAST"
                  : `[ PROCESSING: ${actionStatus.value.toUpperCase()} ]`}
              </button>
            )}

          <a
            href="/news"
            class="font-mono text-sm text-slate-500 hover:text-orange-500 transition-colors uppercase tracking-widest"
          >
            CANCEL
          </a>
        </div>
      </div>
    </div>
  );
}
