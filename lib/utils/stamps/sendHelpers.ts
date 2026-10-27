/* ===== STAMP SEND HELPERS ===== */
/* Pure logic shared by the stamp send tool (page and modal). */

/**
 * Turn the raw editions input into a quantity of at least 1.
 * Empty input, anything that parses to 0 ("0", "000") and negative values
 * all become 1, because /api/v2/create/send rejects quantity <= 0.
 */
export function normalizeSendQuantity(raw: string): number {
  const parsed = parseInt(raw, 10);
  return !parsed || parsed < 1 ? 1 : parsed;
}

/** Request body POSTed to /api/v2/create/send. */
export interface StampSendRequestBody {
  address: string;
  destination: string;
  asset: string;
  quantity: number;
  satsPerVB: number;
  options: {
    return_psbt: true;
    fee_per_kb: number;
    allow_unconfirmed_inputs: true;
  };
}

/** Build the send request. `feeRate` is in sat/vB; the API also gets sat/kB. */
export function buildStampSendRequest(params: {
  address: string;
  destination: string;
  asset: string;
  quantity: number;
  feeRate: number;
}): StampSendRequestBody {
  return {
    address: params.address,
    destination: params.destination,
    asset: params.asset,
    quantity: params.quantity,
    satsPerVB: params.feeRate,
    options: {
      return_psbt: true,
      fee_per_kb: params.feeRate * 1000,
      allow_unconfirmed_inputs: true,
    },
  };
}
