import type { Metadata } from 'next';
import { Backdrop } from '@/components/Backdrop';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { StatusBoard } from '@/components/StatusBoard';
import { brand } from '@/lib/data';

export const metadata: Metadata = {
  title: `Fleet status — ${brand.name}`,
  description: 'Live status of the Hynex Bots hosting fleet — node health, running bots and uptime.',
};

export default function StatusPage() {
  return (
    <>
      <Backdrop />
      <Nav />
      <main>
        <StatusBoard />
      </main>
      <Footer />
    </>
  );
}
