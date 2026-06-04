import { Logo } from './Logo';
import { Icons } from './Icons';
import { brand } from '@/lib/data';

export function Footer() {
  return (
    <footer className="relative border-t border-ink-700 py-14">
      <div className="container-content">
        <div className="flex flex-col items-start justify-between gap-10 md:flex-row">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-mist-muted">{brand.tagline}</p>
            <a href={brand.discordInvite} target="_blank" rel="noreferrer" className="btn-primary mt-6">
              <Icons.discord className="h-4 w-4" />
              Join our Discord
            </a>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <FooterCol
              title="Bots"
              links={[
                ['Moderation', '#bots'],
                ['Ticketing', '#bots'],
                ['Economy', '#bots'],
                ['Music', '#bots'],
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                ['Why Hynex', '#why'],
                ['Process', '#process'],
                ['FAQ', '#faq'],
                ['Custom', '#custom'],
              ]}
            />
            <FooterCol
              title="Contact"
              links={[
                ['Discord', brand.discordInvite],
                ['Email', `mailto:${brand.email}`],
              ]}
            />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-ink-700 pt-6 text-xs text-mist-faint sm:flex-row">
          <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          <p>Built for communities that demand more.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-mist-faint">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="text-sm text-mist-muted transition-colors hover:text-mist">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
