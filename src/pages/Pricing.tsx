import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Key, CheckCircle2, ArrowRight, Sparkles, X } from "lucide-react";
import { useState } from "react";

const PLANS = [
  {
    name: "Tester",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Perfect for getting started and testing the platform.",
    cta: "Get Started",
    ctaLink: "/signup",
    highlight: false,
    features: [
      { name: "3 Applications", included: true },
      { name: "50 License Keys", included: true },
      { name: "HWID Binding", included: true },
      { name: "All Auth Methods", included: true },
      { name: "Token System", included: true },
      { name: "Hash Checks", included: true },
      { name: "Client Two Factor Auth", included: true },
      { name: "Community Support", included: true },
      { name: "Team Management", included: false },
      { name: "Custom Webhooks", included: false },
      { name: "Discord Bot API", included: false },
      { name: "Reseller System", included: false },
      { name: "Seller API", included: false },
      { name: "Priority Support", included: false },
    ],
  },
  {
    name: "Developer",
    monthlyPrice: 2.99,
    yearlyPrice: 14.99,
    description: "For developers building real products with advanced needs.",
    cta: "Choose Developer",
    ctaLink: "/signup",
    highlight: true,
    features: [
      { name: "10 Applications", included: true },
      { name: "10,000 License Keys", included: true },
      { name: "Everything in Tester +", included: true },
      { name: "Team Management", included: true },
      { name: "Customer Panel", included: true },
      { name: "Function Management", included: true },
      { name: "Custom Webhooks", included: true },
      { name: "Variables API", included: true },
      { name: "Anti-Sharing", included: true },
      { name: "Live Analytics", included: true },
      { name: "Email Support", included: true },
      { name: "Discord Bot API", included: false },
      { name: "Reseller System", included: false },
      { name: "Seller API", included: false },
    ],
  },
  {
    name: "Seller",
    monthlyPrice: 4.99,
    yearlyPrice: 24.99,
    description: "For power sellers who need the full platform capabilities.",
    cta: "Choose Seller",
    ctaLink: "/signup",
    highlight: false,
    features: [
      { name: "Unlimited Applications", included: true },
      { name: "Unlimited License Keys", included: true },
      { name: "Everything in Developer +", included: true },
      { name: "Chatrooms", included: true },
      { name: "Discord Bot API", included: true },
      { name: "Telegram Bot", included: true },
      { name: "Reseller System", included: true },
      { name: "Seller API", included: true },
      { name: "Request Signing", included: true },
      { name: "Global Blacklist", included: true },
      { name: "Manager Delegation", included: true },
      { name: "Priority Support", included: true },
      { name: "Custom Branding", included: true },
      { name: "SLA 99.99%", included: true },
    ],
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-32 h-[600px] w-[600px] rounded-full bg-purple-600/[0.1] blur-[120px]" />
        <div className="absolute -right-32 top-[400px] h-[500px] w-[500px] rounded-full bg-violet-500/[0.08] blur-[100px]" />
      </div>

      {/* Nav */}
      <header className="relative z-20 border-b border-border/40 backdrop-blur-xl bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-lg bg-purple-500/30 blur-md" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25">
                <Key className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">Galactic Boosts</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white border-0">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Pricing Header */}
      <section className="relative z-10 px-4 sm:px-6 pt-16 pb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 mb-4">
          <Sparkles className="h-3 w-3 text-purple-400" /> Pricing
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          Perfect plans for your needs.
        </h1>
        <p className="mt-3 text-muted-foreground">Flexible options for teams of all sizes.</p>

        {/* Toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-sm ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative h-7 w-12 rounded-full transition-colors ${yearly ? "bg-purple-600" : "bg-secondary"}`}
          >
            <div className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${yearly ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className={`text-sm ${yearly ? "text-foreground" : "text-muted-foreground"}`}>Yearly</span>
          {yearly && <span className="text-xs font-semibold text-green-400 ml-1">save 60%</span>}
        </div>
      </section>

      {/* Plans */}
      <section className="relative z-10 px-4 sm:px-6 pb-12">
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border backdrop-blur p-6 flex flex-col transition-all ${
                plan.highlight
                  ? "border-purple-500/50 bg-purple-500/5 shadow-xl shadow-purple-500/10"
                  : "border-border/50 bg-card/40"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                {plan.monthlyPrice === 0 ? (
                  <span className="text-4xl font-bold">Free</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                      ${yearly ? plan.yearlyPrice.toFixed(2) : plan.monthlyPrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">/{yearly ? "year" : "month"}</span>
                  </>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>

              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f.name} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    )}
                    <span className={f.included ? "text-foreground/80" : "text-muted-foreground/40"}>
                      {f.name}
                    </span>
                  </li>
                ))}
              </ul>

              <Link to={plan.ctaLink} className="mt-6">
                <Button
                  className={`w-full ${
                    plan.highlight
                      ? "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white border-0"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Full features link */}
      <section className="relative z-10 px-4 sm:px-6 pb-8">
        <div className="mx-auto max-w-5xl">
          <Link to="/#features">
            <Button variant="outline" className="w-full border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-purple-300">
              See the full list of features
            </Button>
          </Link>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            All yearly plans include a 14-day money-back guarantee. No credit card required for free plan.
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="relative z-10 px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6">
          <div className="flex items-start gap-3">
            <span className="text-yellow-500 text-lg">⚠</span>
            <div className="text-sm">
              <p className="font-semibold text-foreground mb-2">Important: We are an authentication service, not a code obfuscator</p>
              <ul className="space-y-1.5 text-muted-foreground text-xs">
                <li><strong className="text-foreground/80">What we provide:</strong> License/key management, HWID binding, server-side validation, rate limiting, webhooks, and admin controls.</li>
                <li><strong className="text-foreground/80">What we do not do:</strong> Code obfuscation, anti-debug/anti-tamper inside your binaries, or DRM for compiled code.</li>
                <li><strong className="text-foreground/80">Your responsibilities:</strong> Integrate checks (don't rely on client-side alone). Use an obfuscator for your executables if needed.</li>
                <li><strong className="text-foreground/80">How they complement:</strong> Obfuscation slows reverse-engineering; Galactic Boosts enforces access and usage via server truth.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-purple-400" />
            <span>© {new Date().getFullYear()} Galactic Boosts</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}