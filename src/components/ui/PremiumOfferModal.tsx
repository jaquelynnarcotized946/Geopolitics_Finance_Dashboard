import { useState } from "react";
import Link from "next/link";

interface PremiumOfferModalProps {
  trialEndDate: Date;
  userCount: number;
  onSkip: () => void;
}

export default function PremiumOfferModal({ trialEndDate, userCount, onSkip }: PremiumOfferModalProps) {
  const [upgrading, setUpgrading] = useState(false);
  const daysRemaining = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isEarlyUser = userCount <= 10;

  const handleUpgrade = async (interval: "monthly" | "yearly") => {
    setUpgrading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to start checkout:", error);
      setUpgrading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
      <div className="rounded-2xl border border-emerald/20 bg-gradient-to-b from-black to-black/80 p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {isEarlyUser ? "Welcome to Premium! 🎉" : "Unlock Premium Intelligence 🚀"}
          </h2>
          <p className="text-sm text-zinc-400">
            {isEarlyUser
              ? "You're one of the first users. Enjoy lifetime premium access!"
              : `You have ${daysRemaining} days of free access. Upgrade anytime.`}
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          <div className="flex gap-3">
            <span className="text-emerald text-lg">✓</span>
            <div>
              <p className="text-white font-semibold text-sm">Unlimited alerts & watchlists</p>
              <p className="text-zinc-500 text-xs">Never miss critical market moves</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-emerald text-lg">✓</span>
            <div>
              <p className="text-white font-semibold text-sm">Premium insights</p>
              <p className="text-zinc-500 text-xs">Deep analysis of geopolitical impact</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-emerald text-lg">✓</span>
            <div>
              <p className="text-white font-semibold text-sm">Faster market refresh</p>
              <p className="text-zinc-500 text-xs">Real-time data without delays</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-emerald text-lg">✓</span>
            <div>
              <p className="text-white font-semibold text-sm">Intraday digests</p>
              <p className="text-zinc-500 text-xs">Stay updated throughout the day</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        {!isEarlyUser && (
          <div className="space-y-3 mb-8">
            <button
              onClick={() => handleUpgrade("monthly")}
              disabled={upgrading}
              className="w-full rounded-lg bg-emerald px-4 py-3 font-semibold text-black transition hover:bg-emerald/90 disabled:opacity-50"
            >
              {upgrading ? "Opening checkout..." : "Upgrade Now — $8/month"}
            </button>
            <button
              onClick={() => handleUpgrade("yearly")}
              disabled={upgrading}
              className="w-full rounded-lg border border-emerald/30 bg-emerald/5 px-4 py-3 font-semibold text-emerald transition hover:bg-emerald/10 disabled:opacity-50"
            >
              {upgrading ? "Opening checkout..." : "Best Value — $79/year"}
            </button>
          </div>
        )}

        {/* Skip/Close Button */}
        <button
          onClick={onSkip}
          disabled={upgrading}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/[0.06] disabled:opacity-50"
        >
          {isEarlyUser ? "Close" : "Skip for Now"}
        </button>

        {/* Footer */}
        {!isEarlyUser && (
          <p className="text-center text-xs text-zinc-500 mt-4">
            Your 7-day trial ends <strong>{new Date(trialEndDate).toLocaleDateString()}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

