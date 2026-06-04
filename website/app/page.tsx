import { Backdrop } from '@/components/Backdrop';
import { Nav } from '@/components/Nav';
import { Hero } from '@/components/Hero';
import { Marquee } from '@/components/Marquee';
import { Features } from '@/components/Features';
import { Catalog } from '@/components/Catalog';
import { Stats } from '@/components/Stats';
import { Process } from '@/components/Process';
import { CustomCTA } from '@/components/CustomCTA';
import { FAQ } from '@/components/FAQ';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Backdrop />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <Catalog />
        <Stats />
        <Process />
        <CustomCTA />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
