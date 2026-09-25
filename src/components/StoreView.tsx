import { useState } from 'react';
import { BookOpen, CheckCircle2, Coffee, Image, Minus, Plus, Search, Shirt, ShoppingBag, ShoppingCart, Trash2 } from 'lucide-react';

const products = [
  { id: 'bolsa', name: 'Bolsa de tela Virla', category: 'Accesorios', description: 'Una compañera para llevar cultura a todas partes.', price: 8500, icon: ShoppingBag, color: 'bg-[#f0e7d8] text-[#766044]' },
  { id: 'taza', name: 'Taza Cultura cotidiana', category: 'Objetos', description: 'Un pequeño ritual con la identidad del Virla.', price: 6500, icon: Coffee, color: 'bg-[#dcecf2] text-[#216583]' },
  { id: 'remera', name: 'Remera Virla', category: 'Indumentaria', description: 'Diseño institucional para vestir nuestra cultura.', price: 18000, icon: Shirt, color: 'bg-[#e3e8f2] text-[#3a5279]' },
  { id: 'cuaderno', name: 'Cuaderno de ideas', category: 'Objetos', description: 'Un espacio para bocetos, historias y nuevas ideas.', price: 7500, icon: BookOpen, color: 'bg-[#e4eee7] text-[#427259]' },
  { id: 'lamina', name: 'Lámina Encuentro', category: 'Arte y libros', description: 'Una propuesta gráfica inspirada en el encuentro cultural.', price: 12000, icon: Image, color: 'bg-[#f3e2dc] text-[#9c6554]' },
  { id: 'libro', name: 'Cuaderno de arte tucumano', category: 'Arte y libros', description: 'Una publicación imaginada para descubrir el arte local.', price: 15000, icon: BookOpen, color: 'bg-[#eee5f1] text-[#80588b]' },
];
const categories = ['Todos', 'Accesorios', 'Objetos', 'Indumentaria', 'Arte y libros'];
const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

export function StoreView() {
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [completed, setCompleted] = useState(false);
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = products.filter(product => (category === 'Todos' || category === product.category) && normalize(product.name).includes(normalize(search.trim())));
  const items = products.filter(product => cart[product.id] > 0);
  const count = items.reduce((sum, product) => sum + cart[product.id], 0);
  const total = items.reduce((sum, product) => sum + cart[product.id] * product.price, 0);

  function changeQuantity(id: string, amount: number) {
    setCart(current => ({ ...current, [id]: Math.max(0, (current[id] || 0) + amount) }));
    setCompleted(false);
    setMessage(amount > 0 ? `${products.find(product => product.id === id)?.name} agregado al carrito.` : 'Carrito actualizado.');
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl bg-[#003865] px-6 py-9 text-white sm:px-10 sm:py-12">
        <div className="absolute -right-12 -top-20 h-72 w-72 rounded-full border-[45px] border-white/5" aria-hidden="true" />
        <span className="inline-flex rounded-full border border-white/30 px-3 py-1 text-xs font-bold tracking-widest">CATÁLOGO DEMO</span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">Tienda Virla</h1>
        <p className="mt-3 max-w-xl text-xl text-blue-100">Llevate un poquito de cultura.</p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-blue-100">Objetos, arte y recuerdos para seguir conectados con el Virla. Explorá esta propuesta de tienda y probá tu próxima compra.</p>
      </section>

      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Demostración: productos, ilustraciones y precios de ejemplo en pesos argentinos. No se realizan cobros ni pedidos reales.</p>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Catálogo de productos">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-2xl font-bold text-[#003865]">Nuestros productos</h2>
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-slate-500">
              <Search size={18} aria-hidden="true" />
              <input type="search" aria-label="Buscar productos" placeholder="Buscar productos" value={search} onChange={event => setSearch(event.target.value)} className="min-h-11 w-full min-w-0 bg-transparent text-base text-slate-900 outline-none focus:ring-2 focus:ring-[#007F8C]" />
            </label>
          </div>
          <div className="my-5 flex flex-wrap gap-2" aria-label="Categorías">
            {categories.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition ${category === item ? 'border-[#004a7f] bg-[#004a7f] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#004a7f]'}`}>{item}</button>)}
          </div>
          <p className="mb-3 text-sm text-slate-500" aria-live="polite">{visible.length} productos de ejemplo</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map(product => <article key={product.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className={`flex h-44 flex-col items-center justify-center gap-3 ${product.color}`} aria-hidden="true">
                <product.icon size={76} strokeWidth={1.15} />
                <span className="text-xs font-bold tracking-[0.3em]">VIRLA</span>
              </div>
              <div className="flex grow flex-col p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#007F8C]">{product.category}</span>
                <h3 className="mt-2 text-lg font-bold text-[#003865]">{product.name}</h3>
                <p className="mb-5 mt-2 text-sm leading-relaxed text-slate-500">{product.description}</p>
                <strong className="mt-auto text-xl">{money(product.price)}</strong>
                <button type="button" onClick={() => changeQuantity(product.id, 1)} aria-label={`Agregar ${product.name} al carrito`} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#004a7f] px-3 text-sm font-bold text-white hover:bg-[#003865]"><Plus size={18} aria-hidden="true" />Agregar al carrito</button>
              </div>
            </article>)}
          </div>
          {visible.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center"><p>No encontramos productos con esos filtros.</p><button type="button" className="mt-4 min-h-11 font-bold text-[#004a7f] underline" onClick={() => { setSearch(''); setCategory('Todos'); }}>Ver todos los productos</button></div>}
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-5" aria-label="Carrito de compras">
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#003865]"><ShoppingCart size={22} aria-hidden="true" />Tu carrito <span className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-sm">{count}</span></h2>
          <div role="status" className={`mt-3 text-sm ${completed ? 'rounded-xl bg-emerald-50 p-3 text-emerald-800' : 'text-[#006a75]'}`}>
            {completed && <CheckCircle2 className="mb-2" aria-hidden="true" />}{message}
          </div>
          {items.length === 0 ? <div className="py-8 text-center text-slate-500"><ShoppingBag className="mx-auto mb-3 text-slate-300" size={40} aria-hidden="true" /><p>Tu carrito está vacío.</p><p className="mt-2 text-sm">Elegí algo que te inspire.</p></div> : <ul className="divide-y divide-slate-100">
            {items.map(product => <li key={product.id} className="py-4">
              <div className="flex justify-between gap-2"><h3 className="font-semibold">{product.name}</h3><button type="button" aria-label={`Quitar ${product.name}`} onClick={() => changeQuantity(product.id, -cart[product.id])} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={17} /></button></div>
              <div className="mt-2 flex items-center justify-between gap-2"><div className="flex items-center rounded-lg border border-slate-200"><button type="button" aria-label={`Restar uno de ${product.name}`} onClick={() => changeQuantity(product.id, -1)} className="flex h-11 w-11 items-center justify-center hover:bg-slate-100"><Minus size={16} /></button><span className="min-w-6 text-center">{cart[product.id]}</span><button type="button" aria-label={`Sumar uno de ${product.name}`} onClick={() => changeQuantity(product.id, 1)} className="flex h-11 w-11 items-center justify-center hover:bg-slate-100"><Plus size={16} /></button></div><strong className="text-sm">{money(product.price * cart[product.id])}</strong></div>
            </li>)}
          </ul>}
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-5 text-lg font-bold"><span>Total demo</span><span>{money(total)}</span></div>
          <button type="button" disabled={!count} onClick={() => { setMessage(`¡Simulación completada! ${count} ${count === 1 ? 'producto' : 'productos'} por ${money(total)}. No se realizó ningún cobro ni se generó un pedido real.`); setCart({}); setCompleted(true); }} className="mt-5 min-h-12 w-full rounded-xl bg-[#007F8C] px-4 font-bold text-white hover:bg-[#006a75] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">Simular compra</button>
          <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">Sin registro ni datos de pago. El carrito se reinicia al recargar la página.</p>
        </aside>
      </div>
    </div>
  );
}
