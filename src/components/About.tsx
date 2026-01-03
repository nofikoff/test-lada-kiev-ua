import { useLanguage } from '../i18n';

export function About() {
  const { t } = useLanguage();

  return (
    <section id="about" className="py-20 md:py-32 bg-lada-darker">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <h2 className="section-title">{t.about.title}</h2>

        <h3 className="text-2xl md:text-3xl font-serif text-white mb-8 [text-wrap:balance]">
          {t.about.heading}
        </h3>

        <div className="space-y-6 text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
          <p className="[text-wrap:balance]">{t.about.text1}</p>
          <p className="[text-wrap:balance]">{t.about.text2}</p>
          <p className="[text-wrap:balance]">{t.about.text3}</p>
          <p className="text-lada-gold font-medium text-xl [text-wrap:balance]">{t.about.text4}</p>
        </div>

        {/* Decorative line */}
        <div className="mt-12 flex justify-center">
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-lada-gold to-transparent" />
        </div>
      </div>
    </section>
  );
}
