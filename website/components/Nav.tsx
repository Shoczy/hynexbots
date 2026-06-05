'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import { Icons } from './Icons';
import { brand } from '@/lib/data';

const links = [
  { href: '/#bots', label: 'Bots' },
  { href: '/#why', label: 'Why Hynex' },
  { href: '/#process', label: 'Process' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/status', label: 'Status' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="fixed inset-x-0 top-0 z-40"
    >
      <div
        className={`mx-auto mt-3 flex max-w-content items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-500 md:px-5 ${
          scrolled ? 'glass shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]' : 'border border-transparent'
        }`}
        style={{ marginLeft: 'max(1.5rem, calc((100vw - 1180px) / 2))', marginRight: 'max(1.5rem, calc((100vw - 1180px) / 2))' }}
      >
        <a href="/" aria-label="Hynex Bots home">
          <Logo />
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-mist-muted transition-colors hover:text-mist"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <a href={brand.discordInvite} target="_blank" rel="noreferrer" className="btn-primary">
            <Icons.discord className="h-4 w-4" />
            Open a ticket
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-ink-600 text-mist md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className="relative block h-3.5 w-5">
            <span className={`absolute left-0 h-0.5 w-5 bg-current transition-all ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
            <span className={`absolute left-0 top-1.5 h-0.5 w-5 bg-current transition-all ${open ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`absolute left-0 h-0.5 w-5 bg-current transition-all ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="container-content mt-2 md:hidden"
          >
            <div className="glass flex flex-col gap-1 rounded-2xl p-3">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-mist-muted hover:bg-ink-800 hover:text-mist"
                >
                  {l.label}
                </a>
              ))}
              <a href={brand.discordInvite} target="_blank" rel="noreferrer" className="btn-primary mt-1">
                <Icons.discord className="h-4 w-4" /> Open a ticket
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
