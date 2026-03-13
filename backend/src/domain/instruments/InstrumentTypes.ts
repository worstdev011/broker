export interface Instrument {
  id: string;
  base: string;
  quote: string;
  digits: number;
  payoutPercent?: number;
}
