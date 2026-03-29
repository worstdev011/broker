import { PrismaClient, InstrumentType } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const instruments = [
  // ─── OTC pairs ────────────────────────────────────────────────────────────
  { id: "EURUSD_OTC",  name: "EUR/USD OTC",  base: "EUR", quote: "USD", type: InstrumentType.OTC,  payoutPercent: 75, sortOrder: 1  },
  { id: "GBPUSD_OTC",  name: "GBP/USD OTC",  base: "GBP", quote: "USD", type: InstrumentType.OTC,  payoutPercent: 72, sortOrder: 2  },
  { id: "USDJPY_OTC",  name: "USD/JPY OTC",  base: "USD", quote: "JPY", type: InstrumentType.OTC,  payoutPercent: 70, sortOrder: 3  },
  { id: "AUDUSD_OTC",  name: "AUD/USD OTC",  base: "AUD", quote: "USD", type: InstrumentType.OTC,  payoutPercent: 68, sortOrder: 4  },
  { id: "USDCAD_OTC",  name: "USD/CAD OTC",  base: "USD", quote: "CAD", type: InstrumentType.OTC,  payoutPercent: 68, sortOrder: 5  },
  { id: "USDCHF_OTC",  name: "USD/CHF OTC",  base: "USD", quote: "CHF", type: InstrumentType.OTC,  payoutPercent: 68, sortOrder: 6  },
  { id: "AUDCAD_OTC",  name: "AUD/CAD OTC",  base: "AUD", quote: "CAD", type: InstrumentType.OTC,  payoutPercent: 67, sortOrder: 7  },
  { id: "AUDCHF_OTC",  name: "AUD/CHF OTC",  base: "AUD", quote: "CHF", type: InstrumentType.OTC,  payoutPercent: 67, sortOrder: 8  },
  { id: "CADJPY_OTC",  name: "CAD/JPY OTC",  base: "CAD", quote: "JPY", type: InstrumentType.OTC,  payoutPercent: 68, sortOrder: 9  },
  { id: "EURJPY_OTC",  name: "EUR/JPY OTC",  base: "EUR", quote: "JPY", type: InstrumentType.OTC,  payoutPercent: 70, sortOrder: 10 },
  { id: "GBPJPY_OTC",  name: "GBP/JPY OTC",  base: "GBP", quote: "JPY", type: InstrumentType.OTC,  payoutPercent: 68, sortOrder: 11 },
  { id: "NZDUSD_OTC",  name: "NZD/USD OTC",  base: "NZD", quote: "USD", type: InstrumentType.OTC,  payoutPercent: 67, sortOrder: 12 },
  { id: "NZDJPY_OTC",  name: "NZD/JPY OTC",  base: "NZD", quote: "JPY", type: InstrumentType.OTC,  payoutPercent: 66, sortOrder: 13 },
  { id: "EURCHF_OTC",  name: "EUR/CHF OTC",  base: "EUR", quote: "CHF", type: InstrumentType.OTC,  payoutPercent: 67, sortOrder: 14 },
  { id: "EURNZD_OTC",  name: "EUR/NZD OTC",  base: "EUR", quote: "NZD", type: InstrumentType.OTC,  payoutPercent: 66, sortOrder: 15 },
  { id: "GBPAUD_OTC",  name: "GBP/AUD OTC",  base: "GBP", quote: "AUD", type: InstrumentType.OTC,  payoutPercent: 67, sortOrder: 16 },
  { id: "CHFNOK_OTC",  name: "CHF/NOK OTC",  base: "CHF", quote: "NOK", type: InstrumentType.OTC,  payoutPercent: 65, sortOrder: 17 },
  { id: "UAHUSD_OTC",  name: "UAH/USD OTC",  base: "UAH", quote: "USD", type: InstrumentType.OTC,  payoutPercent: 65, sortOrder: 18 },
  { id: "BTCUSD_OTC",  name: "BTC/USD OTC",  base: "BTC", quote: "USD", type: InstrumentType.OTC,  payoutPercent: 70, sortOrder: 19 },
  { id: "ETHUSD_OTC",  name: "ETH/USD OTC",  base: "ETH", quote: "USD", type: InstrumentType.OTC,  payoutPercent: 70, sortOrder: 20 },
  { id: "SOLUSD_OTC",  name: "SOL/USD OTC",  base: "SOL", quote: "USD", type: InstrumentType.OTC,  payoutPercent: 68, sortOrder: 21 },
  { id: "BNBUSD_OTC",  name: "BNB/USD OTC",  base: "BNB", quote: "USD", type: InstrumentType.OTC,  payoutPercent: 68, sortOrder: 22 },

  // ─── Real market pairs ────────────────────────────────────────────────────
  { id: "EURUSD_REAL", name: "EUR/USD",  base: "EUR", quote: "USD", type: InstrumentType.REAL, payoutPercent: 80, sortOrder: 30 },
  { id: "GBPUSD_REAL", name: "GBP/USD",  base: "GBP", quote: "USD", type: InstrumentType.REAL, payoutPercent: 78, sortOrder: 31 },
  { id: "USDJPY_REAL", name: "USD/JPY",  base: "USD", quote: "JPY", type: InstrumentType.REAL, payoutPercent: 79, sortOrder: 32 },
  { id: "USDCAD_REAL", name: "USD/CAD",  base: "USD", quote: "CAD", type: InstrumentType.REAL, payoutPercent: 77, sortOrder: 33 },
  { id: "USDCHF_REAL", name: "USD/CHF",  base: "USD", quote: "CHF", type: InstrumentType.REAL, payoutPercent: 77, sortOrder: 34 },
  { id: "EURGBP_REAL", name: "EUR/GBP",  base: "EUR", quote: "GBP", type: InstrumentType.REAL, payoutPercent: 78, sortOrder: 35 },
  { id: "EURJPY_REAL", name: "EUR/JPY",  base: "EUR", quote: "JPY", type: InstrumentType.REAL, payoutPercent: 77, sortOrder: 36 },
  { id: "EURAUD_REAL", name: "EUR/AUD",  base: "EUR", quote: "AUD", type: InstrumentType.REAL, payoutPercent: 76, sortOrder: 37 },
  { id: "EURCAD_REAL", name: "EUR/CAD",  base: "EUR", quote: "CAD", type: InstrumentType.REAL, payoutPercent: 75, sortOrder: 38 },
  { id: "GBPJPY_REAL", name: "GBP/JPY",  base: "GBP", quote: "JPY", type: InstrumentType.REAL, payoutPercent: 75, sortOrder: 39 },
  { id: "GBPCAD_REAL", name: "GBP/CAD",  base: "GBP", quote: "CAD", type: InstrumentType.REAL, payoutPercent: 75, sortOrder: 40 },
  { id: "GBPCHF_REAL", name: "GBP/CHF",  base: "GBP", quote: "CHF", type: InstrumentType.REAL, payoutPercent: 74, sortOrder: 41 },
  { id: "AUDJPY_REAL", name: "AUD/JPY",  base: "AUD", quote: "JPY", type: InstrumentType.REAL, payoutPercent: 76, sortOrder: 42 },
  { id: "AUDCHF_REAL", name: "AUD/CHF",  base: "AUD", quote: "CHF", type: InstrumentType.REAL, payoutPercent: 76, sortOrder: 43 },
  { id: "AUDCAD_REAL", name: "AUD/CAD",  base: "AUD", quote: "CAD", type: InstrumentType.REAL, payoutPercent: 74, sortOrder: 44 },
  { id: "CADJPY_REAL", name: "CAD/JPY",  base: "CAD", quote: "JPY", type: InstrumentType.REAL, payoutPercent: 73, sortOrder: 45 },
  { id: "CADCHF_REAL", name: "CAD/CHF",  base: "CAD", quote: "CHF", type: InstrumentType.REAL, payoutPercent: 73, sortOrder: 46 },
  { id: "CHFJPY_REAL", name: "CHF/JPY",  base: "CHF", quote: "JPY", type: InstrumentType.REAL, payoutPercent: 74, sortOrder: 47 },
];

async function main() {
  console.log("Seeding instruments...");

  for (const instrument of instruments) {
    await prisma.instrument.upsert({
      where: { id: instrument.id },
      update: instrument,
      create: instrument,
    });
  }

  console.log(`Seeded ${instruments.length} instruments`);

  // ─── Admin user ─────────────────────────────────────────────────────────────
  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (existing) {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "ADMIN", password: hashedPassword, isActive: true },
      });
      console.log(`Admin updated: ${adminEmail}`);
    } else {
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: "ADMIN",
          isActive: true,
          accounts: {
            create: [
              { type: "DEMO", balance: 10000 },
              { type: "REAL", balance: 0 },
            ],
          },
        },
      });
      console.log(`Admin created: ${adminEmail}`);
    }
  } else {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin creation");
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
