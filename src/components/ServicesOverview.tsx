import { Sparkles, Heart, Palette, Eye } from 'lucide-react';
import { useLanguage } from '../i18n';

export function ServicesOverview() {
  const { t } = useLanguage();

  const services = [
    {
      icon: Heart,
      name: t.services.massage.name,
      description: t.services.massage.description,
    },
    {
      icon: Sparkles,
      name: t.services.depilation.name,
      description: t.services.depilation.description,
    },
    {
      icon: Palette,
      name: t.services.permanent.name,
      description: t.services.permanent.description,
    },
    {
      icon: Eye,
      name: t.services.makeup.name,
      description: t.services.makeup.description,
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-lada-dark">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="section-title">{t.services.title}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <a
              key={index}
              href="#services"
              className="card group text-center cursor-pointer"
            >
              <div className="mb-4 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-lada-gold/10 flex items-center justify-center group-hover:bg-lada-gold/20 transition-colors">
                  <service.icon className="w-8 h-8 text-lada-gold" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {service.name}
              </h3>
              <p className="text-white/60 text-sm">{service.description}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
