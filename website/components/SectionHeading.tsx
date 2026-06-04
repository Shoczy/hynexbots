import { Reveal } from './ui/Reveal';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: 'center' | 'left';
}) {
  const alignCls = align === 'center' ? 'mx-auto text-center items-center' : 'text-left items-start';
  return (
    <div className={`flex max-w-2xl flex-col gap-4 ${alignCls}`}>
      <Reveal>
        <span className="eyebrow">{eyebrow}</span>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="font-display text-3xl font-semibold tracking-tightest text-mist sm:text-4xl md:text-[2.75rem] md:leading-[1.05]">
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.16}>
          <p className="text-lg leading-relaxed text-mist-muted">{description}</p>
        </Reveal>
      )}
    </div>
  );
}
