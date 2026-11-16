/* ===== CREATOR NAME CLIENT - UNIT TESTS ===== */
import {
  CREATOR_NAME_NOT_OWNER,
  decideCreatorNameSave,
  submitCreatorName,
} from "$lib/utils/creator/creatorNameClient.ts";
import { assertEquals } from "@std/assert";
import { describe, it } from "jsr:@std/testing@1.0.14/bdd";

const OWNER = "bc1qowneraddress";
const wallet = { address: OWNER };

describe("decideCreatorNameSave", () => {
  it("treats an empty draft and no stored name as unchanged", () => {
    assertEquals(decideCreatorNameSave("   ", null), { action: "unchanged" });
  });

  it("treats a trimmed match as unchanged", () => {
    assertEquals(decideCreatorNameSave("  Alice  ", "Alice"), {
      action: "unchanged",
    });
  });

  it("rejects clearing a stored name", () => {
    assertEquals(decideCreatorNameSave("  ", "Alice"), {
      action: "invalid",
      message: "Creator name cannot be empty",
    });
  });

  it("rejects characters the creator name pattern disallows", () => {
    const decision = decideCreatorNameSave("alice@btc", "Alice");
    assertEquals(decision.action, "invalid");
  });

  it("submits a trimmed change", () => {
    assertEquals(decideCreatorNameSave("  Bob  ", "Alice"), {
      action: "submit",
      name: "Bob",
    });
  });
});

describe("submitCreatorName", () => {
  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  it("signs and posts the same trimmed name", async () => {
    let signed = "";
    let posted: Record<string, unknown> | null = null;

    const result = await submitCreatorName({
      address: OWNER,
      name: "  Alice  ",
      wallet,
      signMessage: (message) => {
        signed = message;
        return Promise.resolve("sig");
      },
      getToken: () => Promise.resolve("csrf-token"),
      fetchImpl: (_input, init) => {
        posted = JSON.parse(String(init?.body));
        return Promise.resolve(jsonResponse({ creatorName: "Alice" }));
      },
    });

    assertEquals(result, { status: "success", name: "Alice" });
    assertEquals(posted?.newName, "Alice");
    assertEquals(posted?.address, OWNER);
    assertEquals(posted?.signature, "sig");
    assertEquals(posted?.csrfToken, "csrf-token");
    assertEquals(
      signed,
      `Update creator name to ${posted?.newName} at ${posted?.timestamp}`,
    );
  });

  it("returns cancelled when the wallet rejects the signature", async () => {
    let posted = false;
    const result = await submitCreatorName({
      address: OWNER,
      name: "Alice",
      wallet,
      signMessage: () => Promise.reject(new Error("User rejected request")),
      getToken: () => Promise.resolve("csrf-token"),
      fetchImpl: () => {
        posted = true;
        return Promise.resolve(jsonResponse({}));
      },
    });

    assertEquals(result, { status: "cancelled" });
    assertEquals(posted, false);
  });

  it("returns the API error message", async () => {
    const result = await submitCreatorName({
      address: OWNER,
      name: "Alice",
      wallet,
      signMessage: () => Promise.resolve("sig"),
      getToken: () => Promise.resolve("csrf-token"),
      fetchImpl: () =>
        Promise.resolve(
          jsonResponse({ error: "Invalid signature" }, 400),
        ),
    });

    assertEquals(result, { status: "error", message: "Invalid signature" });
  });

  it("refuses an address the wallet does not own", async () => {
    let signed = false;
    const result = await submitCreatorName({
      address: "bc1qsomeoneelse",
      name: "Alice",
      wallet,
      signMessage: () => {
        signed = true;
        return Promise.resolve("sig");
      },
      getToken: () => Promise.resolve("csrf-token"),
      fetchImpl: () => Promise.resolve(jsonResponse({})),
    });

    assertEquals(result, {
      status: "error",
      message: CREATOR_NAME_NOT_OWNER,
    });
    assertEquals(signed, false);
  });
});
