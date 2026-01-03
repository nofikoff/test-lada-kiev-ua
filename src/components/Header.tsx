import { useState } from 'react';
import { Menu, X, Phone } from 'lucide-react';
import { useLanguage, Language } from '../i18n';

export function Header() {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const languages: { code: Language; label: string }[] = [
    { code: 'ru', label: 'RU' },
    { code: 'ua', label: 'UA' },
    { code: 'en', label: 'EN' },
  ];

  const navItems = [
    { href: '#about', label: t.nav.about },
    { href: '#services', label: t.nav.services },
    { href: '#certificates', label: t.nav.certificates },
    { href: '#contacts', label: t.nav.contacts },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-lada-dark/95 backdrop-blur-sm border-b border-lada-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center">
            <img src="/assets/logo.jpg" alt="Lada N" className="h-10 md:h-12 w-auto" />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-white/80 hover:text-lada-gold transition-colors duration-300 text-sm font-medium"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right side: Language + Phone */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Language Switcher */}
            <div className="flex items-center space-x-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`text-sm font-medium transition-colors duration-300 ${
                    language === lang.code
                      ? 'text-lada-gold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Phone */}
            <a
              href="tel:+380995570045"
              className="flex items-center space-x-2 text-lada-gold hover:text-lada-gold-light transition-colors"
            >
              <Phone size={18} />
              <span className="font-medium">(099) 557-00-45</span>
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white p-2"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-lada-gray">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-white/80 hover:text-lada-gold transition-colors text-lg"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Mobile Language + Phone */}
            <div className="mt-6 pt-4 border-t border-lada-gray">
              <div className="flex items-center space-x-4 mb-4">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`text-sm font-medium ${
                      language === lang.code
                        ? 'text-lada-gold'
                        : 'text-white/60'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              <a
                href="tel:+380995570045"
                className="flex items-center space-x-2 text-lada-gold"
              >
                <Phone size={18} />
                <span>(099) 557-00-45</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
