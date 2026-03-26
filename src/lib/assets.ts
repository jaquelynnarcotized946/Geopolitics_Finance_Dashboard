export type AssetMeta = {
  symbol: string;
  name: string;
  assetClass: string;
  focus: string;
};

const ASSET_METADATA: Record<string, Omit<AssetMeta, "symbol">> = {
  SPY: {
    name: "SPDR S&P 500 ETF Trust",
    assetClass: "ETF",
    focus: "Tracks the 500 largest U.S. stocks",
  },
  QQQ: {
    name: "Invesco QQQ Trust",
    assetClass: "ETF",
    focus: "Tracks Nasdaq-100 growth and technology leaders",
  },
  GLD: {
    name: "SPDR Gold Shares",
    assetClass: "Commodity ETF",
    focus: "Tracks physical gold bullion",
  },
  XLE: {
    name: "Energy Select Sector SPDR Fund",
    assetClass: "ETF",
    focus: "U.S. oil, gas, and energy producers",
  },
  TLT: {
    name: "iShares 20+ Year Treasury Bond ETF",
    assetClass: "Bond ETF",
    focus: "Long-dated U.S. Treasury exposure",
  },
  ITA: {
    name: "iShares U.S. Aerospace & Defense ETF",
    assetClass: "ETF",
    focus: "Defense contractors and aerospace manufacturers",
  },
  USO: {
    name: "United States Oil Fund",
    assetClass: "Commodity ETF",
    focus: "Front-month crude oil futures exposure",
  },
  NVDA: {
    name: "NVIDIA Corporation",
    assetClass: "Stock",
    focus: "AI chips, GPUs, and data center infrastructure",
  },
  SMH: {
    name: "VanEck Semiconductor ETF",
    assetClass: "ETF",
    focus: "Semiconductor designers, fabs, and equipment makers",
  },
  FXI: {
    name: "iShares China Large-Cap ETF",
    assetClass: "ETF",
    focus: "Large-cap Chinese companies",
  },
  BABA: {
    name: "Alibaba Group Holding",
    assetClass: "Stock",
    focus: "Chinese e-commerce and cloud computing",
  },
  TSM: {
    name: "Taiwan Semiconductor Manufacturing",
    assetClass: "Stock",
    focus: "Global semiconductor foundry leader",
  },
  VXX: {
    name: "iPath Series B S&P 500 VIX Short-Term Futures ETN",
    assetClass: "ETN",
    focus: "Short-term volatility exposure",
  },
  XLF: {
    name: "Financial Select Sector SPDR Fund",
    assetClass: "ETF",
    focus: "U.S. banks, insurers, and financial firms",
  },
  EEM: {
    name: "iShares MSCI Emerging Markets ETF",
    assetClass: "ETF",
    focus: "Broad emerging-market equities",
  },
  WEAT: {
    name: "Teucrium Wheat Fund",
    assetClass: "Commodity ETF",
    focus: "Wheat futures exposure",
  },
  ICLN: {
    name: "iShares Global Clean Energy ETF",
    assetClass: "ETF",
    focus: "Renewable power and clean-energy companies",
  },
  URA: {
    name: "Global X Uranium ETF",
    assetClass: "ETF",
    focus: "Uranium miners and nuclear fuel supply chain",
  },
  BDRY: {
    name: "Breakwave Dry Bulk Shipping ETF",
    assetClass: "ETF",
    focus: "Dry bulk freight rate exposure",
  },
  BITO: {
    name: "ProShares Bitcoin Strategy ETF",
    assetClass: "ETF",
    focus: "Bitcoin futures exposure",
  },
  LMT: {
    name: "Lockheed Martin",
    assetClass: "Stock",
    focus: "Defense systems, aircraft, and missiles",
  },
  RTX: {
    name: "RTX Corporation",
    assetClass: "Stock",
    focus: "Defense electronics, missiles, and aerospace systems",
  },
  NOC: {
    name: "Northrop Grumman",
    assetClass: "Stock",
    focus: "Defense, space, and strategic systems",
  },
  BA: {
    name: "Boeing",
    assetClass: "Stock",
    focus: "Commercial aircraft and defense aerospace",
  },
  GD: {
    name: "General Dynamics",
    assetClass: "Stock",
    focus: "Defense systems, submarines, and business aviation",
  },
  KWEB: {
    name: "KraneShares CSI China Internet ETF",
    assetClass: "ETF",
    focus: "Chinese internet and platform companies",
  },
  EWJ: {
    name: "iShares MSCI Japan ETF",
    assetClass: "ETF",
    focus: "Broad Japanese equity exposure",
  },
  EWY: {
    name: "iShares MSCI South Korea ETF",
    assetClass: "ETF",
    focus: "Broad South Korean equity exposure",
  },
  INDA: {
    name: "iShares MSCI India ETF",
    assetClass: "ETF",
    focus: "Large- and mid-cap Indian equities",
  },
  EWZ: {
    name: "iShares MSCI Brazil ETF",
    assetClass: "ETF",
    focus: "Brazilian large- and mid-cap equities",
  },
  EWG: {
    name: "iShares MSCI Germany ETF",
    assetClass: "ETF",
    focus: "German equities and exporters",
  },
  EWU: {
    name: "iShares MSCI United Kingdom ETF",
    assetClass: "ETF",
    focus: "U.K. large- and mid-cap equities",
  },
  EWT: {
    name: "iShares MSCI Taiwan ETF",
    assetClass: "ETF",
    focus: "Taiwanese large- and mid-cap equities",
  },
  EZU: {
    name: "iShares MSCI Eurozone ETF",
    assetClass: "ETF",
    focus: "Eurozone large- and mid-cap equities",
  },
  XLV: {
    name: "Health Care Select Sector SPDR Fund",
    assetClass: "ETF",
    focus: "U.S. healthcare providers, biotech, and pharma",
  },
  CORN: {
    name: "Teucrium Corn Fund",
    assetClass: "Commodity ETF",
    focus: "Corn futures exposure",
  },
  UNG: {
    name: "United States Natural Gas Fund",
    assetClass: "Commodity ETF",
    focus: "Natural gas futures exposure",
  },
  HACK: {
    name: "ETFMG Prime Cyber Security ETF",
    assetClass: "ETF",
    focus: "Cybersecurity software and infrastructure companies",
  },
  CRWD: {
    name: "CrowdStrike Holdings",
    assetClass: "Stock",
    focus: "Endpoint security and cloud cybersecurity",
  },
  XBI: {
    name: "SPDR S&P Biotech ETF",
    assetClass: "ETF",
    focus: "Biotechnology research and drug development",
  },
  SLV: {
    name: "iShares Silver Trust",
    assetClass: "Commodity ETF",
    focus: "Tracks physical silver bullion",
  },
  IAU: {
    name: "iShares Gold Trust",
    assetClass: "Commodity ETF",
    focus: "Tracks physical gold bullion",
  },
  TIP: {
    name: "iShares TIPS Bond ETF",
    assetClass: "Bond ETF",
    focus: "Inflation-protected U.S. Treasury bonds",
  },
  XOM: {
    name: "Exxon Mobil",
    assetClass: "Stock",
    focus: "Global integrated oil and gas operations",
  },
  CVX: {
    name: "Chevron",
    assetClass: "Stock",
    focus: "Global oil, gas, and energy infrastructure",
  },
  AVAV: {
    name: "AeroVironment",
    assetClass: "Stock",
    focus: "Drones, loitering munitions, and defense systems",
  },
  HII: {
    name: "Huntington Ingalls Industries",
    assetClass: "Stock",
    focus: "U.S. naval shipbuilding and defense services",
  },
  XLI: {
    name: "Industrial Select Sector SPDR Fund",
    assetClass: "ETF",
    focus: "U.S. industrial, transport, and machinery companies",
  },
  IYR: {
    name: "iShares U.S. Real Estate ETF",
    assetClass: "ETF",
    focus: "U.S. REITs and real estate operators",
  },
  UUP: {
    name: "Invesco DB U.S. Dollar Index Bullish Fund",
    assetClass: "Currency ETF",
    focus: "U.S. dollar strength versus major currencies",
  },
  DBA: {
    name: "Invesco DB Agriculture Fund",
    assetClass: "Commodity ETF",
    focus: "Basket of key agricultural futures",
  },
  FXE: {
    name: "Invesco CurrencyShares Euro Trust",
    assetClass: "Currency ETF",
    focus: "Euro versus U.S. dollar exposure",
  },
  XLU: {
    name: "Utilities Select Sector SPDR Fund",
    assetClass: "ETF",
    focus: "U.S. electric, gas, and utility operators",
  },
  "CL=F": {
    name: "WTI Crude Oil Futures",
    assetClass: "Futures",
    focus: "Front-month crude oil contract pricing",
  },
  RSX: {
    name: "VanEck Russia ETF",
    assetClass: "ETF",
    focus: "Russian equity exposure",
  },
  EWA: {
    name: "iShares MSCI Australia ETF",
    assetClass: "ETF",
    focus: "Australian large- and mid-cap equities",
  },
};

export function getAssetMeta(symbol: string): AssetMeta {
  const normalized = symbol.toUpperCase();
  const meta = ASSET_METADATA[normalized];

  if (meta) {
    return { symbol: normalized, ...meta };
  }

  return {
    symbol: normalized,
    name: "Tracked market instrument",
    assetClass: "Asset",
    focus: "Open the asset detail page for more context",
  };
}
