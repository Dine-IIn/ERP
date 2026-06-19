import prisma from './db';

const EXCHANGE_RATE_API = "https://open.er-api.com/v6/latest/USD";

/**
 * Fetch latest rates from the open exchange rate API and store them in the database.
 */
export async function syncExchangeRates(): Promise<void> {
  try {
    console.log("🌐 [Currency Service] Syncing exchange rates from API...");
    const response = await fetch(EXCHANGE_RATE_API);
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json() as { result: string; base_code: string; rates: Record<string, number> };
    if (data.result !== "success" || !data.rates) {
      throw new Error("Invalid API response format");
    }

    const baseCode = data.base_code || "USD";
    const rateEntries = Object.entries(data.rates);

    console.log(`🌐 [Currency Service] Storing ${rateEntries.length} exchange rates in database...`);
    
    // We run in transaction to make sure database updates are clean
    await prisma.$transaction(
      rateEntries.map(([targetCode, rate]) => 
        prisma.exchangeRate.upsert({
          where: {
            baseCode_targetCode: {
              baseCode: baseCode.toUpperCase(),
              targetCode: targetCode.toUpperCase()
            }
          },
          update: { rate: Number(rate) },
          create: {
            baseCode: baseCode.toUpperCase(),
            targetCode: targetCode.toUpperCase(),
            rate: Number(rate)
          }
        })
      )
    );

    console.log("🌐 [Currency Service] Exchange rates successfully synchronized.");
  } catch (err: any) {
    console.error("❌ [Currency Service Error] Failed to sync exchange rates:", err.message);
  }
}

/**
 * Start the daily synchronization loop.
 */
export function startCurrencySyncLoop(): void {
  // Sync on startup
  syncExchangeRates().catch(console.error);

  // Repeat once every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    syncExchangeRates().catch(console.error);
  }, TWENTY_FOUR_HOURS);
}

/**
 * Helper to convert an amount between two currencies using the cached database rates.
 */
export async function convertCurrency(amount: number, fromCode: string, toCode: string): Promise<number> {
  const cleanFrom = (fromCode || "USD").toUpperCase().trim();
  const cleanTo = (toCode || "USD").toUpperCase().trim();

  if (cleanFrom === cleanTo) {
    return amount;
  }

  try {
    // 1. Fetch rates for the fromCode and toCode relative to base USD
    const rateA = await prisma.exchangeRate.findUnique({
      where: { baseCode_targetCode: { baseCode: "USD", targetCode: cleanFrom } }
    });
    
    const rateB = await prisma.exchangeRate.findUnique({
      where: { baseCode_targetCode: { baseCode: "USD", targetCode: cleanTo } }
    });

    // 2. Determine rates (fallback to standard rates if DB not populated yet)
    let valA = rateA?.rate;
    let valB = rateB?.rate;

    if (!valA) {
      if (cleanFrom === "INR") valA = 83.5;
      else if (cleanFrom === "EUR") valA = 0.92;
      else valA = 1.0; // fallback
    }

    if (!valB) {
      if (cleanTo === "INR") valB = 83.5;
      else if (cleanTo === "EUR") valB = 0.92;
      else valB = 1.0; // fallback
    }

    // Convert from A to USD, then USD to B
    const amountInUsd = amount / valA;
    const convertedAmount = amountInUsd * valB;

    return Number(convertedAmount.toFixed(4));
  } catch (err: any) {
    console.error("❌ [Currency Service] Conversion error, using 1:1 fallback:", err.message);
    return amount;
  }
}
