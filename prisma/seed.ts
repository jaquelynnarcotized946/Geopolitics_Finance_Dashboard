import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create test user
  const passwordHash = await bcrypt.hash("testpass123", 10);
  const user = await prisma.user.upsert({
    where: { email: "test@geopulse.dev" },
    update: {},
    create: {
      name: "Test User",
      email: "test@geopulse.dev",
      passwordHash,
    },
  });
  console.log("Test user created:", user.email);

  // Create default watchlist for test user
  const watchlist = await prisma.watchlist.upsert({
    where: { id: "default-watchlist" },
    update: {},
    create: {
      id: "default-watchlist",
      name: "Primary",
      userId: user.id,
      items: {
        create: [
          { symbol: "SPY", name: "S&P 500 ETF", assetClass: "ETF" },
          { symbol: "XLE", name: "Energy Select ETF", assetClass: "ETF" },
          { symbol: "GLD", name: "SPDR Gold Trust", assetClass: "Commodity" },
          { symbol: "TLT", name: "iShares 20+ Year Treasury", assetClass: "Bond" },
          { symbol: "ITA", name: "Aerospace & Defense ETF", assetClass: "ETF" },
          { symbol: "QQQ", name: "Nasdaq-100 ETF", assetClass: "ETF" },
          { symbol: "USO", name: "United States Oil Fund", assetClass: "Commodity" },
          { symbol: "NVDA", name: "NVIDIA Corporation", assetClass: "Stock" },
        ],
      },
    },
  });
  console.log("Default watchlist created:", watchlist.name);

  // Create sample events
  const sampleEvents = [
    {
      title: "Red Sea shipping lanes face renewed Houthi disruptions",
      summary: "Maritime advisories cite elevated risk premiums and rerouting of tankers around the Cape of Good Hope, adding significant transit costs.",
      source: "BBC World",
      url: "https://example.com/seed-red-sea-1",
      region: "Middle East",
      countryCode: "YE",
      severity: 8,
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      title: "NATO accelerates defense procurement amid Eastern European tensions",
      summary: "Alliance members agree to increase defense spending commitments, lifting demand expectations across aerospace supply chains.",
      source: "Defense News",
      url: "https://example.com/seed-nato-defense-1",
      region: "Europe",
      countryCode: "BE",
      severity: 7,
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      title: "Federal Reserve signals slower pace of rate cuts in 2026",
      summary: "FOMC minutes reveal divided committee on timing of further easing, with several members citing persistent inflation concerns.",
      source: "Federal Reserve Press Releases",
      url: "https://example.com/seed-fed-rates-1",
      region: "North America",
      countryCode: "US",
      severity: 7,
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      title: "US expands semiconductor export controls targeting China",
      summary: "New restrictions limit sales of advanced AI chips and chipmaking equipment to Chinese entities, escalating tech tensions.",
      source: "Reuters World",
      url: "https://example.com/seed-chip-ban-1",
      region: "Asia-Pacific",
      countryCode: "CN",
      severity: 8,
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
      title: "OPEC+ considers extending oil production cuts",
      summary: "Saudi Arabia pushes for continued output restraint as global demand growth slows, crude prices steady above $80.",
      source: "CNBC World",
      url: "https://example.com/seed-opec-cuts-1",
      region: "Middle East",
      countryCode: "SA",
      severity: 6,
      publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    },
    {
      title: "Ukraine counter-offensive gains ground in southern regions",
      summary: "Forces advance along multiple axes as Western weapons deliveries accelerate. Grain export concerns resurface.",
      source: "Al Jazeera",
      url: "https://example.com/seed-ukraine-1",
      region: "Europe",
      countryCode: "UA",
      severity: 9,
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      title: "Taiwan strait military exercises raise regional alarm",
      summary: "PLA conducts large-scale naval drills near Taiwan, semiconductor supply chain concerns intensify globally.",
      source: "NPR World",
      url: "https://example.com/seed-taiwan-1",
      region: "Asia-Pacific",
      countryCode: "TW",
      severity: 9,
      publishedAt: new Date(Date.now() - 14 * 60 * 60 * 1000),
    },
    {
      title: "European Central Bank holds rates steady amid inflation debate",
      summary: "ECB maintains current policy stance while signaling data-dependent approach to future cuts.",
      source: "Financial Times World",
      url: "https://example.com/seed-ecb-1",
      region: "Europe",
      countryCode: "DE",
      severity: 5,
      publishedAt: new Date(Date.now() - 16 * 60 * 60 * 1000),
    },
    {
      title: "North Korea conducts ballistic missile test over Sea of Japan",
      summary: "Pyongyang launches intermediate-range ballistic missile, prompting emergency UN Security Council session.",
      source: "AP News World",
      url: "https://example.com/seed-nk-missile-1",
      region: "Asia-Pacific",
      countryCode: "KP",
      severity: 10,
      publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
    },
    {
      title: "India-China border tensions flare at Ladakh checkpoint",
      summary: "Military standoff at disputed border point raises concerns about broader Asian stability and trade disruptions.",
      source: "BBC World",
      url: "https://example.com/seed-india-china-1",
      region: "Asia-Pacific",
      countryCode: "IN",
      severity: 7,
      publishedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    },
  ];

  for (const event of sampleEvents) {
    await prisma.event.upsert({
      where: { url: event.url },
      update: {},
      create: event,
    });
  }
  console.log(`Created ${sampleEvents.length} sample events`);

  // Create correlations for sample events
  const correlationData = [
    { url: "https://example.com/seed-red-sea-1", correlations: [
      { symbol: "BDRY", impactScore: 0.8, impactDirection: "up", impactMagnitude: 3.2 },
      { symbol: "USO", impactScore: 0.7, impactDirection: "up", impactMagnitude: 1.8 },
      { symbol: "XLE", impactScore: 0.65, impactDirection: "up", impactMagnitude: 1.2 },
    ]},
    { url: "https://example.com/seed-nato-defense-1", correlations: [
      { symbol: "ITA", impactScore: 0.75, impactDirection: "up", impactMagnitude: 2.1 },
      { symbol: "LMT", impactScore: 0.7, impactDirection: "up", impactMagnitude: 1.9 },
      { symbol: "RTX", impactScore: 0.6, impactDirection: "up", impactMagnitude: 1.4 },
    ]},
    { url: "https://example.com/seed-fed-rates-1", correlations: [
      { symbol: "TLT", impactScore: 0.8, impactDirection: "down", impactMagnitude: 0.8 },
      { symbol: "SPY", impactScore: 0.6, impactDirection: "down", impactMagnitude: 0.5 },
      { symbol: "GLD", impactScore: 0.5, impactDirection: "up", impactMagnitude: 0.4 },
    ]},
    { url: "https://example.com/seed-chip-ban-1", correlations: [
      { symbol: "SMH", impactScore: 0.8, impactDirection: "down", impactMagnitude: 2.5 },
      { symbol: "NVDA", impactScore: 0.7, impactDirection: "down", impactMagnitude: 3.1 },
      { symbol: "TSM", impactScore: 0.65, impactDirection: "down", impactMagnitude: 2.8 },
      { symbol: "FXI", impactScore: 0.6, impactDirection: "down", impactMagnitude: 1.9 },
    ]},
    { url: "https://example.com/seed-opec-cuts-1", correlations: [
      { symbol: "USO", impactScore: 0.8, impactDirection: "up", impactMagnitude: 1.5 },
      { symbol: "XLE", impactScore: 0.7, impactDirection: "up", impactMagnitude: 1.1 },
    ]},
    { url: "https://example.com/seed-ukraine-1", correlations: [
      { symbol: "GLD", impactScore: 0.75, impactDirection: "up", impactMagnitude: 1.3 },
      { symbol: "WEAT", impactScore: 0.7, impactDirection: "up", impactMagnitude: 4.2 },
      { symbol: "ITA", impactScore: 0.6, impactDirection: "up", impactMagnitude: 1.1 },
    ]},
    { url: "https://example.com/seed-taiwan-1", correlations: [
      { symbol: "TSM", impactScore: 0.8, impactDirection: "down", impactMagnitude: 4.5 },
      { symbol: "SMH", impactScore: 0.75, impactDirection: "down", impactMagnitude: 3.2 },
      { symbol: "GLD", impactScore: 0.6, impactDirection: "up", impactMagnitude: 1.8 },
      { symbol: "ITA", impactScore: 0.55, impactDirection: "up", impactMagnitude: 2.0 },
    ]},
    { url: "https://example.com/seed-ecb-1", correlations: [
      { symbol: "FXE", impactScore: 0.6, impactDirection: "down", impactMagnitude: 0.3 },
      { symbol: "EZU", impactScore: 0.5, impactDirection: "mixed", impactMagnitude: 0.2 },
    ]},
    { url: "https://example.com/seed-nk-missile-1", correlations: [
      { symbol: "GLD", impactScore: 0.8, impactDirection: "up", impactMagnitude: 2.1 },
      { symbol: "ITA", impactScore: 0.7, impactDirection: "up", impactMagnitude: 1.8 },
      { symbol: "SPY", impactScore: 0.6, impactDirection: "down", impactMagnitude: 1.2 },
    ]},
    { url: "https://example.com/seed-india-china-1", correlations: [
      { symbol: "INDA", impactScore: 0.6, impactDirection: "down", impactMagnitude: 1.5 },
      { symbol: "FXI", impactScore: 0.55, impactDirection: "down", impactMagnitude: 1.1 },
      { symbol: "GLD", impactScore: 0.5, impactDirection: "up", impactMagnitude: 0.7 },
    ]},
  ];

  for (const data of correlationData) {
    const event = await prisma.event.findUnique({ where: { url: data.url } });
    if (!event) continue;

    for (const corr of data.correlations) {
      await prisma.correlation.create({
        data: {
          eventId: event.id,
          symbol: corr.symbol,
          impactScore: corr.impactScore,
          impactDirection: corr.impactDirection,
          impactMagnitude: corr.impactMagnitude,
          window: "24h",
        },
      });
    }
  }
  console.log("Created correlations for sample events");

  // Create sample patterns
  const patterns = [
    { eventCategory: "conflict", symbol: "GLD", avgImpactPct: 1.8, direction: "up", confidence: 0.78, occurrences: 12 },
    { eventCategory: "conflict", symbol: "ITA", avgImpactPct: 2.1, direction: "up", confidence: 0.72, occurrences: 10 },
    { eventCategory: "conflict", symbol: "SPY", avgImpactPct: 0.9, direction: "down", confidence: 0.55, occurrences: 8 },
    { eventCategory: "energy", symbol: "CL=F", avgImpactPct: 1.5, direction: "up", confidence: 0.82, occurrences: 15 },
    { eventCategory: "energy", symbol: "XLE", avgImpactPct: 1.2, direction: "up", confidence: 0.75, occurrences: 14 },
    { eventCategory: "sanctions", symbol: "GLD", avgImpactPct: 1.3, direction: "up", confidence: 0.68, occurrences: 8 },
    { eventCategory: "sanctions", symbol: "SMH", avgImpactPct: 2.5, direction: "down", confidence: 0.65, occurrences: 6 },
    { eventCategory: "economic", symbol: "TLT", avgImpactPct: 0.7, direction: "mixed", confidence: 0.6, occurrences: 11 },
    { eventCategory: "threat", symbol: "GLD", avgImpactPct: 2.3, direction: "up", confidence: 0.85, occurrences: 9 },
    { eventCategory: "threat", symbol: "ITA", avgImpactPct: 1.9, direction: "up", confidence: 0.7, occurrences: 7 },
  ];

  for (const p of patterns) {
    await prisma.pattern.upsert({
      where: {
        eventCategory_symbol: {
          eventCategory: p.eventCategory,
          symbol: p.symbol,
        },
      },
      update: p,
      create: p,
    });
  }
  console.log(`Created ${patterns.length} patterns`);

  // Create ingestion log so "Synced" shows a time
  await prisma.ingestionLog.create({
    data: {
      source: "all",
      eventsFound: sampleEvents.length,
      status: "success",
      startedAt: new Date(Date.now() - 5 * 60 * 1000),
      completedAt: new Date(),
    },
  });
  console.log("Created ingestion log entry");

  // Create sample alert for test user
  await prisma.alert.create({
    data: {
      userId: user.id,
      name: "Oil spike > 2%",
      condition: "Brent crude up 2% in 4h",
      status: "armed",
    },
  });
  console.log("Created sample alert");

  console.log("\nSeed complete!");
  console.log("Login credentials: test@geopulse.dev / testpass123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
