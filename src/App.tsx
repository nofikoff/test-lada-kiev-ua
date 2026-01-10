import { useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LanguageContext, translations, Language } from './i18n';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { ServicesOverview } from './components/ServicesOverview';
import { PriceList } from './components/PriceList';
import { Certificates } from './components/Certificates';
import { Footer } from './components/Footer';

const urlToLang: Record<string, Language> = {
  '/': 'ua',
  '/ru': 'ru',
  '/en': 'en',
};

const langToUrl: Record<Language, string> = {
  'ua': '/',
  'ru': '/ru',
  'en': '/en',
};

function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const language: Language = urlToLang[location.pathname] || 'ua';

  const setLanguage = useCallback((newLang: Language) => {
    navigate(langToUrl[newLang]);
  }, [navigate]);

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language, setLanguage]
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/ru" element={<LandingPage />} />
        <Route path="/en" element={<LandingPage />} />
        <Route path="/:lang" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
