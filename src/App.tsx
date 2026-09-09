import { ExternalLink, MapPin, Phone } from 'lucide-react';
import { PublicAgendaView } from './components/PublicAgendaView';
import { ENTRADANET_BASE_URL } from './infrastructure/entradanet';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7f9] text-slate-900">
      <a
        href="#agenda-publica"
        className="fixed left-3 top-3 z-50 -translate-y-24 rounded-lg bg-white px-4 py-2 font-bold text-[#004a7f] shadow-lg focus:translate-y-0"
      >
        Ir a la agenda
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="bg-[#002f52] px-4 py-2 text-white sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-sm">
            <strong className="tracking-wide">Universidad Nacional de Tucumán</strong>
            <span className="hidden text-white/80 sm:inline">Secretaría de Extensión Universitaria</span>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <img
              src="/logo-virla.png"
              alt="Centro Cultural Virla"
              className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
            />
            <div className="min-w-0 border-l border-slate-200 pl-3 sm:pl-4">
              <strong className="block truncate text-lg text-[#003865] sm:text-xl">Centro Cultural Virla</strong>
              <span className="block text-sm text-slate-500">Agenda pública</span>
            </div>
          </div>

          <a
            href={ENTRADANET_BASE_URL}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#004a7f] px-4 text-base font-bold text-white shadow-sm transition hover:bg-[#003865]"
            aria-label="Ir a eventos y entradas en EntradaNet"
          >
            <span className="hidden sm:inline">Ver eventos y entradas</span>
            <span className="sm:hidden">Entradas</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="grid h-1 grid-cols-5" aria-hidden="true">
          <span className="bg-[#2A87AB]" />
          <span className="bg-[#47A2CC]" />
          <span className="bg-[#62BCFF]" />
          <span className="bg-[#3F82BC]" />
          <span className="bg-[#295B88]" />
        </div>
      </header>

      <main id="agenda-publica" tabIndex={-1} className="mx-auto w-full max-w-7xl grow px-4 py-7 outline-none sm:px-6 sm:py-9 lg:px-8">
        <PublicAgendaView />
      </main>

      <footer className="mt-8 border-t-4 border-[#007F8C] bg-[#001f36] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <strong className="text-lg">Centro Cultural Virla · UNT</strong>
            <p className="mt-1 text-sm text-slate-300">Arte, cultura y extensión universitaria en Tucumán.</p>
          </div>
          <div className="space-y-2 text-base text-slate-200">
            <p className="flex items-center gap-2">
              <MapPin className="h-5 w-5 shrink-0 text-[#62BCFF]" aria-hidden="true" />
              25 de Mayo 265, San Miguel de Tucumán
            </p>
            <a href="tel:+543814221692" className="flex items-center gap-2 hover:text-white">
              <Phone className="h-5 w-5 shrink-0 text-[#62BCFF]" aria-hidden="true" />
              (381) 422-1692
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
