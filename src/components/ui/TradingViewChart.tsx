import { useEffect, useRef, memo } from "react";

type Props = {
  symbol: string;
  height?: number;
  interval?: string;
  theme?: "dark" | "light";
};

/**
 * TradingView Advanced Chart Widget (free, no API key needed).
 * Uses their official embed script.
 */
function TradingViewChartInner({ symbol, height = 400, interval = "D", theme = "dark" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: theme,
      style: "1",
      locale: "en",
      backgroundColor: "rgba(10, 10, 15, 1)",
      gridColor: "rgba(255, 255, 255, 0.03)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";

    containerRef.current.appendChild(wrapper);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, interval, theme]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container overflow-hidden rounded-xl border border-white/[0.06]"
      style={{ height, width: "100%" }}
    />
  );
}

export const TradingViewChart = memo(TradingViewChartInner);

/**
 * TradingView Mini Chart Widget — compact chart for inline use.
 */
function MiniChartInner({ symbol, height = 220 }: { symbol: string; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      width: "100%",
      height: height,
      locale: "en",
      dateRange: "1M",
      colorTheme: "dark",
      isTransparent: true,
      autosize: false,
      largeChartUrl: "",
      chartOnly: false,
      noTimeScale: false,
    });

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";

    containerRef.current.appendChild(wrapper);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, height]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container overflow-hidden rounded-lg"
      style={{ height, width: "100%" }}
    />
  );
}

export const MiniChart = memo(MiniChartInner);

/**
 * TradingView Symbol Overview Widget — shows price + sparkline.
 */
function SymbolOverviewInner({ symbols }: { symbols: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || symbols.length === 0) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: symbols.map(s => [s, `${s}|1M`]),
      chartOnly: false,
      width: "100%",
      height: 400,
      locale: "en",
      colorTheme: "dark",
      autosize: false,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      lineWidth: 2,
      lineType: 0,
      dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"],
    });

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";

    containerRef.current.appendChild(wrapper);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbols.join(",")]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container overflow-hidden rounded-xl border border-white/[0.06]"
      style={{ height: 400, width: "100%" }}
    />
  );
}

export const SymbolOverview = memo(SymbolOverviewInner);
