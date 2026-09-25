import { useEffect, useState } from 'react';
import App from './App';
import { AuthGate } from './components/LoginView';
import { InstitutionalLanding } from './components/InstitutionalLanding';
import { WelcomeView } from './components/WelcomeView';
import { PersonalProfileProvider } from './context/PersonalProfileContext';

const publicSections = new Set(['', '#portada', '#cultura', '#encuentros', '#contacto']);
export function Portal() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const isPublic = publicSections.has(hash);
  useEffect(() => {
    if (isPublic && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [hash, isPublic]);
  return isPublic ? <InstitutionalLanding/> : <AuthGate><PersonalProfileProvider>{['#inicio', '#bienvenida'].includes(hash) ? <WelcomeView/> : <App/>}</PersonalProfileProvider></AuthGate>;
}
