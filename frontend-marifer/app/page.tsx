import Link from 'next/link';

export default function Home() {
  return (
    <main>
      {/* ── Hero ── dark, immersive, full-width */}
      <section className="relative min-h-[90vh] bg-tierra flex items-end pb-20 px-6 md:px-16 overflow-hidden">
        {/* Decorative background texture */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 80%, #C4A882 0%, transparent 50%), radial-gradient(circle at 80% 20%, #7A9A78 0%, transparent 50%)',
          }}
        />

        <div className="relative max-w-5xl w-full">
          <div className="w-12 h-px bg-sand mb-8" />
          <p className="text-sand text-xs tracking-[0.4em] uppercase mb-6"
            style={{ fontFamily: 'var(--font-josefin)', fontWeight: 300 }}>
            Yoga · Ayurveda · Bienestar
          </p>
          <h1
            className="text-6xl md:text-8xl lg:text-9xl text-beige-light leading-none mb-8"
            style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700 }}
          >
            Un camino<br />hacia ti
          </h1>
          <p className="text-sand text-lg md:text-xl max-w-xl leading-relaxed mb-12">
            Acompaño a personas a reconectar con su salud a través del yoga,
            el ayurveda y los retiros de bienestar.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/retiros"
              className="px-8 py-4 border border-sand text-sand text-xs tracking-widest uppercase hover:bg-sand hover:text-tierra transition-colors rounded-wellness"
            >
              Ver retiros
            </Link>
            <Link
              href="/ayurveda"
              className="px-8 py-4 text-tierra-light text-xs tracking-widest uppercase hover:text-sand transition-colors"
              style={{ fontFamily: 'var(--font-josefin)', letterSpacing: '0.25em' }}
            >
              Ayurveda ↓
            </Link>
          </div>
        </div>
      </section>

      {/* ── About strip ── */}
      <section className="bg-beige-light border-y border-beige-lino py-16 px-6 md:px-16">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="w-8 h-px bg-sand shrink-0 md:w-px md:h-16" />
          <p className="text-tierra-mid text-xl md:text-2xl leading-relaxed max-w-3xl"
            style={{ fontFamily: 'var(--font-eb-garamond)' }}>
            "El bienestar no es un destino, es una práctica diaria. Cada clase, cada retiro,
            cada momento de quietud es un paso hacia una versión más plena de ti."
          </p>
        </div>
      </section>

      {/* ── Offerings grid ── */}
      <section className="bg-beige py-24 px-6 md:px-16">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14">
            <div className="w-8 h-px bg-sand mb-5" />
            <h2 className="text-3xl md:text-4xl text-tierra"
              style={{ fontFamily: 'var(--font-playfair)' }}>
              ¿Dónde empezamos?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-beige-lino border border-beige-lino">
            {/* Retiros */}
            <Link href="/retiros" className="bg-beige p-10 hover:bg-white transition-colors group">
              <p className="label-wellness mb-3">Retiros</p>
              <h3 className="text-2xl text-tierra mb-3 group-hover:text-tierra-mid transition-colors"
                style={{ fontFamily: 'var(--font-fredoka)' }}>
                Retiros de bienestar
              </h3>
              <p className="text-tierra-light text-sm leading-relaxed mb-6">
                Espacios para desconectar del ruido, respirar profundo y volver a ti.
                En la naturaleza, en comunidad.
              </p>
              <span className="text-xs tracking-widest uppercase text-sand group-hover:text-tierra-light transition-colors">
                Ver retiros →
              </span>
            </Link>

            {/* Ayurveda */}
            <Link href="/ayurveda" className="bg-beige p-10 hover:bg-white transition-colors group">
              <p className="label-wellness mb-3">Ayurveda</p>
              <h3 className="text-2xl text-tierra mb-3 group-hover:text-tierra-mid transition-colors"
                style={{ fontFamily: 'var(--font-josefin)', fontWeight: 300, letterSpacing: '0.12em' }}>
                DIPLOMADOS Y CURSOS
              </h3>
              <p className="text-tierra-light text-sm leading-relaxed mb-6">
                Formación profunda en la ciencia de la vida. Diplomados, cocina ayurvédica,
                mudras y cursos especiales.
              </p>
              <span className="text-xs tracking-widest uppercase text-sand group-hover:text-tierra-light transition-colors">
                Conoce más →
              </span>
            </Link>

            {/* Biblioteca */}
            <Link href="/contenido" className="bg-beige p-10 hover:bg-white transition-colors group">
              <p className="label-wellness mb-3">Biblioteca</p>
              <h3 className="text-2xl text-tierra mb-3 group-hover:text-tierra-mid transition-colors"
                style={{ fontFamily: 'var(--font-eb-garamond)' }}>
                Artículos y videos
              </h3>
              <p className="text-tierra-light text-sm leading-relaxed mb-6">
                Recursos para tu práctica diaria. Lecturas, meditaciones guiadas
                y videos de yoga.
              </p>
              <span className="text-xs tracking-widest uppercase text-sand group-hover:text-tierra-light transition-colors">
                Explorar →
              </span>
            </Link>

            {/* Eventos */}
            <Link href="/eventos" className="bg-beige p-10 hover:bg-white transition-colors group">
              <p className="label-wellness mb-3">Eventos</p>
              <h3 className="text-2xl text-tierra mb-3 group-hover:text-tierra-mid transition-colors">
                Clases especiales
              </h3>
              <p className="text-tierra-light text-sm leading-relaxed mb-6">
                Talleres, masterclasses y encuentros en comunidad. Eventos únicos
                para seguir creciendo.
              </p>
              <span className="text-xs tracking-widest uppercase text-sand group-hover:text-tierra-light transition-colors">
                Ver eventos →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Shala CTA ── dark section linking to shalayoga.com */}
      <section className="bg-tierra-mid py-20 px-6 md:px-16">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="text-sand text-xs tracking-[0.4em] uppercase mb-4"
              style={{ fontFamily: 'var(--font-josefin)', fontWeight: 300 }}>
              App de yoga
            </p>
            <h2 className="text-4xl md:text-5xl text-beige-light mb-3"
              style={{ fontFamily: 'var(--font-playfair)', fontWeight: 900 }}>
              Shala
            </h2>
            <p className="text-sand text-sm leading-relaxed max-w-md">
              Reserva clases, compra paquetes y lleva el control de tu práctica.
              Tu estudio de yoga, en línea.
            </p>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_SHALA_URL || 'https://shalayoga.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-8 py-4 border border-sand text-sand text-xs tracking-widest uppercase hover:bg-sand hover:text-tierra transition-colors rounded-wellness"
          >
            Ir a Shala →
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-beige border-t border-beige-lino py-12 px-6 md:px-16">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-tierra text-sm tracking-[0.15em] uppercase font-medium mb-1">Marifer</p>
            <p className="text-tierra-light text-xs">Yoga · Ayurveda · Bienestar</p>
          </div>
          <nav className="flex flex-wrap gap-6">
            {[
              { label: 'Retiros', href: '/retiros' },
              { label: 'Ayurveda', href: '/ayurveda' },
              { label: 'Biblioteca', href: '/contenido' },
              { label: 'Eventos', href: '/eventos' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="text-xs tracking-widest uppercase text-tierra-light hover:text-tierra transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </main>
  );
}
