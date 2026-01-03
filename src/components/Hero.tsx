import { Phone } from 'lucide-react';
import { useLanguage } from '../i18n';

export function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-lada-darker via-lada-dark to-lada-gray-light" />

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lada-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-lada-red/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        {/* Logo mark */}
        <div className="mb-8">
          <img src="/assets/logo.jpg" alt="Lada N" className="h-24 md:h-32 w-auto mx-auto" />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4 [text-wrap:balance]">
          {t.hero.title}
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-lada-gold font-light mb-8 [text-wrap:balance]">
          {t.hero.subtitle}
        </p>

        {/* Description */}
        <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto mb-12 leading-relaxed [text-wrap:balance]">
          {t.hero.description}
        </p>

        {/* CTA Button */}
        <a
          href="tel:+380995570045"
          className="inline-flex items-center space-x-3 btn-primary text-lg"
        >
          <Phone size={20} />
          <span>{t.hero.cta}</span>
        </a>

        {/* Address hint */}
        <p className="mt-8 text-white/50 text-sm">
          {t.footer.address} {t.footer.landmark}
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-lada-gold/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-lada-gold/50 rounded-full mt-2" />
        </div>
      </div>
    </section>
  );
}
