// TODO: replace with real price provider (WebSocket or HTTP polling to external data source)
// Currently generates prices the same way as OTC for development purposes.

import { OtcPriceEngine } from "./OtcPriceEngine.js";

export class RealPriceEngine extends OtcPriceEngine {
  constructor(instrumentId: string) {
    super(instrumentId);
  }
}
