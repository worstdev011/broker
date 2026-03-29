import { EventEmitter } from "node:events";
import { OtcPriceEngine, type PriceTick } from "./engines/OtcPriceEngine.js";
import { RealWebSocketHub } from "./engines/RealWebSocketHub.js";
import { REAL_INSTRUMENTS } from "../config/instruments.js";
import { prisma } from "../infrastructure/prisma/client.js";
import { logger } from "../shared/logger.js";

interface InstrumentDef {
  id: string;
  type: "REAL" | "OTC";
}

export class PriceEngineManager extends EventEmitter {
  private engines = new Map<string, OtcPriceEngine>();
  private latestPrices = new Map<string, number>();
  private hub: RealWebSocketHub | null = null;

  start(instruments: InstrumentDef[]): void {
    const apiKey = process.env.XCHANGE_API_KEY || "";
    const hasApiKey = apiKey.length > 0;

    const realInstruments: InstrumentDef[] = [];
    const otcInstruments: InstrumentDef[] = [];

    for (const inst of instruments) {
      if (inst.type === "REAL") {
        realInstruments.push(inst);
      } else {
        otcInstruments.push(inst);
      }
    }

    // OTC engines
    for (const inst of otcInstruments) {
      const engine = new OtcPriceEngine(inst.id);

      engine.on("tick", (tick: PriceTick) => {
        this.handleTick(tick);
      });

      this.engines.set(inst.id, engine);
      engine.start();
    }

    // Real instruments via XChange WebSocket hub
    if (realInstruments.length > 0) {
      if (!hasApiKey) {
        logger.warn(
          { count: realInstruments.length },
          "XCHANGE_API_KEY not set — skipping real instruments. Set it in .env to enable real market data.",
        );
      } else {
        this.hub = new RealWebSocketHub(apiKey, (tick: PriceTick) => {
          this.handleTick(tick);
        });

        for (const inst of realInstruments) {
          const config = REAL_INSTRUMENTS[inst.id];
          if (!config) {
            logger.warn({ instrumentId: inst.id }, "No real instrument config found, skipping");
            continue;
          }
          this.hub.subscribe(config.pair, inst.id);
        }

        this.hub.start();
        logger.info(
          { count: realInstruments.length },
          "Real price hub started",
        );
      }
    }

    logger.info(
      { otc: otcInstruments.length, real: hasApiKey ? realInstruments.length : 0 },
      "Price engines started",
    );
  }

  private handleTick(tick: PriceTick): void {
    this.latestPrices.set(tick.instrumentId, tick.price);
    this.emit("price:tick", tick);

    prisma.pricePoint
      .upsert({
        where: {
          symbol_timestamp: {
            symbol: tick.instrumentId,
            timestamp: BigInt(tick.timestamp),
          },
        },
        update: {},
        create: {
          symbol: tick.instrumentId,
          timestamp: BigInt(tick.timestamp),
          price: tick.price,
        },
      })
      .catch((err) => {
        logger.warn({ err, symbol: tick.instrumentId }, "Failed to persist price point");
      });
  }

  getPrice(instrumentId: string): number | undefined {
    return this.latestPrices.get(instrumentId);
  }

  getAllPrices(): Map<string, number> {
    return new Map(this.latestPrices);
  }

  stop(): void {
    for (const engine of this.engines.values()) {
      engine.stop();
    }
    this.engines.clear();

    if (this.hub) {
      this.hub.stop();
      this.hub = null;
    }

    logger.info("Price engines stopped");
  }
}
