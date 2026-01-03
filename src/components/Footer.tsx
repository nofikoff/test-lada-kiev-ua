import { MapPin, Phone, Clock, Instagram } from 'lucide-react';
import { useLanguage } from '../i18n';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer id="contacts" className="bg-lada-darker border-t border-lada-gray">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h3 className="text-2xl font-serif text-lada-gold mb-8">
              {t.nav.contacts}
            </h3>

            <div className="space-y-6">
              {/* Address */}
              <div className="flex items-start space-x-4">
                <MapPin className="w-6 h-6 text-lada-gold flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white">{t.footer.address}</p>
                  <p className="text-white/60">{t.footer.landmark}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center space-x-4">
                <Phone className="w-6 h-6 text-lada-gold flex-shrink-0" />
                <a
                  href="tel:+380995570045"
                  className="text-white hover:text-lada-gold transition-colors text-lg"
                >
                  (099) 557-00-45
                </a>
              </div>

              {/* Schedule */}
              <div className="flex items-start space-x-4">
                <Clock className="w-6 h-6 text-lada-gold flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white">{t.footer.schedule}</p>
                  <p className="text-white/50 text-sm">{t.footer.appointment}</p>
                </div>
              </div>

              {/* Instagram */}
              <div className="flex items-center space-x-4">
                <Instagram className="w-6 h-6 text-lada-gold flex-shrink-0" />
                <a
                  href="https://www.instagram.com/massage.ln.kyiv/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-lada-gold transition-colors"
                >
                  @massage.ln.kyiv
                </a>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="h-64 md:h-auto rounded-xl overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2540.5!2d30.5213!3d50.4501!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40d4ce50f8b6e3ed%3A0x5f1e4d5b5a5b5e5d!2z0YPQuy4g0JzQsNC70LDRjyDQltC40YLQvtC80LjRgNGB0LrQsNGPLCAxMCwg0JrQuNC10LI!5e0!3m2!1sru!2sua!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '250px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Lada N Location"
            />
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-lada-gray flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <img src="/assets/logo.jpg" alt="Lada N" className="h-8 w-auto" />
            <span className="text-white/60">|</span>
            <span className="text-white/60">Lada N</span>
          </div>

          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} Lada N. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
