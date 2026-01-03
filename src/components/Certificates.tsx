import { Gift, Phone } from 'lucide-react';
import { useLanguage } from '../i18n';

export function Certificates() {
  const { t } = useLanguage();

  return (
    <section id="certificates" className="py-20 md:py-32 bg-lada-dark">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="card py-12 px-8 md:px-16 border border-lada-gold/20">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-lada-gold/10 flex items-center justify-center">
              <Gift className="w-10 h-10 text-lada-gold" />
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-lada-gold mb-6">
            {t.certificates.title}
          </h2>

          <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
            {t.certificates.text}
          </p>

          <a
            href="tel:+380995570045"
            className="inline-flex items-center space-x-3 btn-secondary text-lg"
          >
            <Phone size={20} />
            <span>{t.certificates.cta}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
