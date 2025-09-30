import Link from "next/link";
import HomeDiscover from "./components/HomeDiscover";

export default function Home() {
  return (
    <div className="relative mx-auto max-w-6xl px-4 py-16">
      <div aria-hidden className="pointer-events-none absolute -top-20 -left-24 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl" />

      <section className="grid grid-cols-1 md:grid-cols-[1.6fr_0.9fr] gap-10 items-center">
        <div className="space-y-6 min-w-0">
          <div className="inline-flex items-center text-xs px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 leading-tight">
            <span className="sm:hidden">Crowdfunding · Sponsorship · Tipping</span>
            <span className="hidden sm:inline">Crowdfunding & Donation · Private Sponsorship/Membership · Private Tipping</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent leading-tight">
            <span className="sm:hidden block">Let Kindness Choose<br />How to Be Seen</span>
            <span className="hidden sm:block">Let Kindness Choose How to Be Seen</span>
          </h1>
          <p className="text-base leading-relaxed text-purple-700/90">
            You can wear a mask and be secretly great, or reveal your identity and shine openly.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/swap"
              className="h-11 px-4 sm:px-5 inline-flex items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-200 text-sm sm:text-base"
            >
              <span className="sm:hidden">Swap</span>
              <span className="hidden sm:inline">Go to Swap (Wrap zETHc)</span>
            </Link>
            <Link
              href="/projects"
              className="h-11 px-4 sm:px-5 inline-flex items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-200 text-sm sm:text-base"
            >
              Discover
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 p-4 sm:p-6 bg-white card-surface md:justify-self-end md:max-w-[480px] w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-xl border border-black/10 p-3 sm:p-4 shadow-sm hover:shadow-md transition bg-white card-surface">
              <div className="flex items-center gap-2 mb-2">
                <ShieldIcon />
                <div className="text-sm font-semibold">Anonymous / Public</div>
              </div>
              <div className="text-xs text-black/70 leading-relaxed">Support anonymously with decryption only for you, or contribute publicly with your name.</div>
            </div>
            <div className="rounded-xl border border-black/10 p-3 sm:p-4 shadow-sm hover:shadow-md transition bg-white card-surface">
              <div className="flex items-center gap-2 mb-2">
                <LockIcon />
                <div className="text-sm font-semibold">Fully Encrypted</div>
              </div>
              <div className="text-xs text-black/70 leading-relaxed">Based on Zama FHE, amounts processed in encrypted form with minimal disclosure.</div>
            </div>
            <div className="rounded-xl border border-black/10 p-3 sm:p-4 shadow-sm hover:shadow-md transition bg-white card-surface">
              <div className="flex items-center gap-2 mb-2">
                <EyeOffIcon />
                <div className="text-sm font-semibold">Privacy First</div>
              </div>
              <div className="text-xs text-black/70 leading-relaxed">Only essential status indicators are shown, protecting participant privacy.</div>
            </div>
            <div className="rounded-xl border border-black/10 p-3 sm:p-4 shadow-sm hover:shadow-md transition bg-white card-surface">
              <div className="flex items-center gap-2 mb-2">
                <BadgeIcon />
                <div className="text-sm font-semibold">Auditable</div>
              </div>
              <div className="text-xs text-black/70 leading-relaxed">On-demand authorization for audit addresses to view aggregated amounts.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-black/10 p-6 bg-white card-surface">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl border border-black/10 p-4 bg-white card-surface">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white text-xs">1</span>
              Wrap Assets
            </div>
            <div className="text-black/70">Wrap ETH into zETHc to enter the confidential asset system.</div>
          </div>
          <div className="rounded-xl border border-black/10 p-4 bg-white card-surface">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white text-xs">2</span>
              Choose Identity
            </div>
            <div className="text-black/70">Anonymous or public, be seen as you wish.</div>
          </div>
          <div className="rounded-xl border border-black/10 p-4 bg-white card-surface">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white text-xs">3</span>
              Contribute & Record
            </div>
            <div className="text-black/70 leading-relaxed">Amounts processed in encrypted form throughout; only essential status disclosed.</div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/create?category=crowdfunding"
            className="h-11 sm:h-12 px-4 sm:px-6 inline-flex items-center gap-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-200 text-sm sm:text-base"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <span className="sm:hidden">Crowdfunding</span>
            <span className="hidden sm:inline">Create Crowdfunding</span>
          </Link>
          <Link
            href="/create?category=sponsorship"
            className="h-11 sm:h-12 px-4 sm:px-6 inline-flex items-center gap-2 rounded-full border border-purple-300 bg-white text-purple-700 hover:bg-purple-50 text-sm sm:text-base"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 10a5 5 0 1010 0 5 5 0 00-10 0z" stroke="currentColor" strokeWidth="1.5"/><path d="M4 21a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.5"/></svg>
            <span className="sm:hidden">Sponsorship</span>
            <span className="hidden sm:inline">Create Sponsorship</span>
          </Link>
          <Link
            href="/create?category=tip"
            className="h-11 sm:h-12 px-4 sm:px-6 inline-flex items-center gap-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-200 text-sm sm:text-base"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21l-6-5 6-11 6 11-6 5z" stroke="currentColor" strokeWidth="1.5"/></svg>
            <span className="sm:hidden">Tipping</span>
            <span className="hidden sm:inline">Create Tipping</span>
          </Link>
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Discover</h2>
          <Link href="/projects" className="text-sm text-purple-700 hover:underline">View All</Link>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 bg-white card-surface">
          <HomeDiscover />
        </div>
      </section>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-600">
      <path d="M12 3l7 4v5c0 4-2.8 7.5-7 9-4.2-1.5-7-5-7-9V7l7-4z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-600">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-600">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6c-2.1 0-4-.6-5.6-1.6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-600">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 14l5 3 5-3v5l-5 2-5-2v-5z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
