import { INSTRUMENTS } from '../../config/instruments.js';

export type MarketStatus = 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';

export interface MarketAlternative {
  instrumentId: string;
  label: string;
  payout: number;
}

export interface MarketStatusResult {
  marketOpen: boolean;
  marketStatus: MarketStatus;
  nextMarketOpenAt: string | null;
  topAlternatives: MarketAlternative[];
}

function getNextMarketOpenTime(currentTime: number): number {
  const date = new Date(currentTime);
  const dayOfWeek = date.getDay();

  let daysUntilMonday: number;
  if (dayOfWeek === 0) {
    daysUntilMonday = 1;
  } else if (dayOfWeek === 6) {
    daysUntilMonday = 2;
  } else {
    daysUntilMonday = (8 - dayOfWeek) % 7;
  }

  const nextMonday = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + daysUntilMonday,
    0, 0, 0, 0,
  ));

  return nextMonday.getTime();
}

function getTopAlternatives(currentInstrumentId: string, limit: number = 5): MarketAlternative[] {
  return Object.values(INSTRUMENTS)
    .filter((inst) => inst.id !== currentInstrumentId)
    .map((inst) => {
      const label = inst.source === 'otc'
        ? `${inst.base}/${inst.quote} OTC`
        : `${inst.base}/${inst.quote}`;

      let payout: number;
      if (inst.source === 'otc') {
        payout = inst.payoutPercent ?? 90;
      } else if (['BTC', 'ETH', 'SOL', 'BNB'].includes(inst.base)) {
        payout = inst.payoutPercent ?? 88;
      } else {
        payout = inst.payoutPercent ?? 85;
      }

      return { instrumentId: inst.id, label, payout };
    })
    .sort((a, b) => b.payout - a.payout)
    .slice(0, limit);
}

/**
 * OTC instruments are always open.
 * FX (real) instruments are closed on weekends (Saturday/Sunday).
 */
export function getMarketStatus(
  instrumentSource: 'otc' | 'real',
  currentInstrumentId: string,
  currentTime: number = Date.now(),
): MarketStatusResult {
  const topAlternatives = getTopAlternatives(currentInstrumentId, 5);

  if (instrumentSource === 'otc') {
    return { marketOpen: true, marketStatus: 'OPEN', nextMarketOpenAt: null, topAlternatives };
  }

  const date = new Date(currentTime);
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const nextOpenTime = getNextMarketOpenTime(currentTime);
    return {
      marketOpen: false,
      marketStatus: 'WEEKEND',
      nextMarketOpenAt: new Date(nextOpenTime).toISOString(),
      topAlternatives,
    };
  }

  return { marketOpen: true, marketStatus: 'OPEN', nextMarketOpenAt: null, topAlternatives };
}
