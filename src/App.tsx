import { useState, useMemo } from 'react';
import { LanguageContext, translations, Language } from './i18n';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { ServicesOverview } from './components/ServicesOverview';
import { PriceList } from './components/PriceList';
import { Certificates } from './components/Certificates';
import { Footer } from './components/Footer';

function App() {
  const [language, setLanguage] = useState<Language>('ru');

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      <div className="min-h-screen bg-lada-dark">
        <Header />
        <main>
          <Hero />
          <About />
          <ServicesOverview />
          <PriceList />
          <Certificates />
        </main>
        <Footer />
      </div>
    </LanguageContext.Provider>
  );
}

export default App;
