import Link from "next/link";
import { getServerSession } from "next-auth/next";
import type { GetServerSidePropsContext } from "next";
import PublicLayout from "../components/layout/PublicLayout";
import { authOptions } from "./api/auth/[...nextauth]";

export default function Home() {
  return (
    <PublicLayout>
      <div className="flex flex-1 flex-col">
        <header className="flex flex-col items-start gap-6">
          <span className="chip">GeoPulse v2.0</span>
          <h1 className="text-4xl font-bold text-ink md:text-5xl">
            Real-time geopolitics meets{" "}
            <span className="text-gradient">market intelligence.</span>
          </h1>
          <p className="max-w-2xl text-base text-slate">
            Track geopolitical events, correlate them with market movements, and surface the
            assets most exposed to each headline. Built for analysts, investors, and macro
            operators who need clarity in fast-moving environments.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/signin" className="btn-primary">
              Sign in
            </Link>
            <Link href="/auth/signup" className="btn-secondary">
              Create account
            </Link>
          </div>
        </header>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Event Timeline",
              description: "Chronological feed of global events with severity scoring and market reactions side-by-side.",
              icon: (
                <svg className="h-5 w-5 text-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              title: "Impact Evidence",
              description: "See exactly which stocks moved after each event, with live prices and confidence scores.",
              icon: (
                <svg className="h-5 w-5 text-accent2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                </svg>
              ),
            },
            {
              title: "Pattern Predictions",
              description: "AI learns from historical correlations to predict market reactions to similar events.",
              icon: (
                <svg className="h-5 w-5 text-ocean" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              ),
            },
          ].map((feature) => (
            <div key={feature.title} className="surface-card p-5">
              <div className="mb-3">{feature.icon}</div>
              <h3 className="text-base font-bold text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="surface-card p-6">
            <p className="text-[10px] uppercase tracking-widest text-slate">Why GeoPulse</p>
            <h2 className="mt-3 text-2xl font-bold text-ink">
              Make every headline <span className="text-gradient">actionable.</span>
            </h2>
            <p className="mt-3 text-sm text-slate">
              GeoPulse unifies RSS signals, GDELT coverage, and market feeds into a single
              command center. It refreshes on a schedule, learns patterns from history,
              and shows you exactly which assets moved because of each geopolitical event.
            </p>
          </div>
          <div className="surface-card p-6">
            <p className="text-[10px] uppercase tracking-widest text-slate">Features</p>
            <ul className="mt-3 space-y-3 text-sm text-slate">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                100+ event-to-asset correlation mappings
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                Live stock prices with Google Finance
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                Pattern recognition & prediction engine
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                Scheduled ingestion + manual sync
              </li>
            </ul>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (session) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }
  return { props: {} };
}
