import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteLayout } from "../components/shell/SiteLayout";

const contributors = [
  { name: "KADHIRAVAN EG", handle: "JOKER-53", initials: "KE", github: "https://github.com/JOKER-53", linkedin: "https://www.linkedin.com/in/kadhiravan-e-g/" },
  { name: "Harish Kumar", handle: "Harishkumar-47", initials: "HK", github: "https://github.com/Harishkumar-47", linkedin: "https://www.linkedin.com/in/harish-kumar-vs/" },
];
const externalLink = "inline-flex items-center rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-body hover:bg-sunken hover:text-ink";

export function CreditsPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "Credits · FLAMES";
    return () => { if (document.title === "Credits · FLAMES") document.title = previous; };
  }, []);
  return <SiteLayout fullWidth>
    <div className="w-full">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-5 border-b border-line pb-7">
        <div className="min-w-0">
          <Link to="/" className="text-sm text-muted underline underline-offset-4 hover:text-ink">Back to courses</Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">The people behind FLAMES</h1>
          <p className="mt-3 max-w-[72ch] text-sm leading-7 text-body">Building a place to learn firewall administration through hands-on FortiGate and Palo Alto simulations.</p>
        </div>
        <p className="shrink-0 text-sm text-muted">A project by <span className="font-semibold text-ink">BeyondBug</span></p>
      </header>

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] xl:gap-9">
        <figure className="min-w-0" aria-labelledby="team-photo-caption">
          <div className="relative rounded-xl border border-line bg-surface p-2 sm:p-3">
            <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px h-8 w-8 rounded-tl-xl border-l-2 border-t-2 border-accent" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px h-8 w-8 rounded-br-xl border-b-2 border-r-2 border-accent" />
            <img src="/images/beyondbug-team.png" alt="Four BeyondBug team members standing beside a display showing the organization's GitHub repositories." width={1280} height={567} decoding="async" className="block h-auto w-full rounded-md" />
          </div>
          <figcaption id="team-photo-caption" className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted"><span className="font-medium text-body">BeyondBug team</span><span>The team behind the work.</span></figcaption>
        </figure>

        <section aria-labelledby="contributors-heading" className="min-w-0">
          <div className="mb-4 flex items-center gap-3"><h2 id="contributors-heading" className="text-xl font-semibold text-ink">Contributors</h2><div aria-hidden="true" className="h-px flex-1 bg-line" /></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            {contributors.map(person => <article key={person.handle} className="min-w-0 rounded-lg border border-line bg-surface p-5">
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-line bg-canvas text-sm font-semibold text-ink" aria-hidden="true">{person.initials}</div>
                <div className="min-w-0"><h3 className="text-lg font-semibold text-ink">{person.name}</h3><p className="mt-1 text-sm text-muted">@{person.handle}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"><p className="text-xs text-muted">FLAMES contributor</p><div className="flex flex-wrap gap-2">
                <a className={externalLink} href={person.github} target="_blank" rel="noopener noreferrer" aria-label={`${person.name} on GitHub (opens in a new tab)`}>GitHub</a>
                <a className={externalLink} href={person.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${person.name} on LinkedIn (opens in a new tab)`}>LinkedIn</a>
              </div></div>
            </article>)}
          </div>
        </section>
      </div>

      <section aria-labelledby="organization-heading" className="mt-9 grid gap-5 border-t border-line py-7 lg:grid-cols-[minmax(180px,0.6fr)_minmax(0,1.4fr)_auto] lg:items-center">
        <div><h2 id="organization-heading" className="text-sm text-muted">Our organization</h2><h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">BeyondBug</h3></div>
        <p className="max-w-[65ch] text-sm leading-7 text-body">The organization behind our work on FLAMES. Explore our repositories, follow what we build, and connect with us.</p>
        <div className="flex flex-wrap gap-2">
          <a className={externalLink} href="https://github.com/orgs/BeyondBug/repositories" target="_blank" rel="noopener noreferrer" aria-label="BeyondBug repositories on GitHub (opens in a new tab)">GitHub repositories</a>
          <a className={externalLink} href="https://www.linkedin.com/company/beyoundbug/?viewAsMember=true" target="_blank" rel="noopener noreferrer" aria-label="BeyondBug on LinkedIn (opens in a new tab)">LinkedIn</a>
        </div>
      </section>
    </div>
  </SiteLayout>;
}
