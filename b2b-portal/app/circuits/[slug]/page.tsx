// app/circuits/[slug]/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { promises as fs } from 'fs';
import path from 'path';

async function getCircuit(slug: string) {
  // Încearcă mai întâi fișierul complet
  let filePath = path.join(process.cwd(), 'data', 'circuits_data_complete.json');
  
  // Dacă nu există, folosește cel vechi
  const fsSync = require('fs');
  if (!fsSync.existsSync(filePath)) {
    filePath = path.join(process.cwd(), 'data', 'circuits_data.json');
  }
  
  const fileContents = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(fileContents);
  
  return data.circuits.find((c: any) => c.slug === slug);
}

export default async function CircuitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const circuit = await getCircuit(slug);
  
  if (!circuit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Circuit negăsit</h1>
          <Link href="/" className="text-orange-500 hover:underline">
            ← Înapoi la listă
          </Link>
        </div>
      </div>
    );
  }
  
  const agencyCommission = 10;
  const basePrice = circuit.prices.double || 0;
  const agencyPrice = Math.round(basePrice - (basePrice * agencyCommission / 100));
  
  // Grupează plecările după dată
  const departuresByDate = circuit.departures.reduce((acc: any, dep: any) => {
    const dateKey = dep.departureDate;
    
    if (!acc[dateKey]) {
      acc[dateKey] = {
        departureDate: dep.departureDate,
        returnDate: dep.returnDate,
        status: dep.status,
        rooms: []
      };
    }
    
    acc[dateKey].rooms.push({
      type: dep.roomType,
      price: dep.price
    });
    
    return acc;
  }, {});
  
  const groupedDepartures = Object.values(departuresByDate);
  
  // Grupează pe luni
  const departuresByMonth: Record<string, any[]> = {};
  groupedDepartures.forEach((dep: any) => {
    const date = new Date(dep.departureDate);
    const monthKey = date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
    
    if (!departuresByMonth[monthKey]) {
      departuresByMonth[monthKey] = [];
    }
    departuresByMonth[monthKey].push(dep);
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-orange-500 hover:underline flex items-center gap-2">
            <span>←</span> Înapoi la circuite
          </Link>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {circuit.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  📍 {circuit.continent}
                </span>
                <span className="flex items-center gap-1">
                  🌙 {circuit.nights}
                </span>
                <span className="flex items-center gap-1">
                  📅 {groupedDepartures.length} plecări disponibile
                </span>
              </div>
            </div>
            
            {/* Image Gallery */}
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              {circuit.mainImage && (
                <div className="relative h-96">
                  <Image
                    src={circuit.mainImage}
                    alt={circuit.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              
              {circuit.gallery.length > 1 && (
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {circuit.gallery.slice(1, 5).map((img: string, i: number) => (
                      <div key={i} className="relative h-20 rounded overflow-hidden">
                        <Image
                          src={img}
                          alt={`${circuit.name} ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Description */}
            {circuit.shortDescription && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-3">Despre circuit</h2>
                <p className="text-gray-700 leading-relaxed">
                  {circuit.shortDescription}
                </p>
                <a 
                  href={circuit.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block mt-4 text-orange-500 hover:underline"
                >
                  Vezi descrierea completă pe jinfotours.ro →
                </a>
              </div>
            )}
            
            {/* PDF Download */}
            {circuit.pdfLink && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-blue-900">
                      Program detaliat PDF
                    </div>
                    <div className="text-sm text-blue-700">
                      Descarcă programul complet al circuitului
                    </div>
                  </div>
                  <a
                    href={circuit.pdfLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    📄 Descarcă PDF
                  </a>
                </div>
              </div>
            )}
            
            {/* Departures */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Plecări disponibile</h2>
              
              <div className="space-y-6">
                {Object.entries(departuresByMonth).map(([month, deps]) => (
                  <div key={month}>
                    <h3 className="font-semibold text-gray-900 mb-3 capitalize text-lg flex items-center gap-2">
                      <span className="text-orange-500">📅</span>
                      {month}
                    </h3>
                    
                    <div className="space-y-4">
                      {deps.map((dep: any, i: number) => {
                        const depDate = new Date(dep.departureDate);
                        const retDate = new Date(dep.returnDate);
                        
                        // Folosim allOptions din circuit.prices (toate au aceleași prețuri)
                        const allPriceOptions = circuit.prices.allOptions || [];
                        const hasMultipleOptions = allPriceOptions.length > 2;
                        
                        return (
                          <div 
                            key={i}
                            className="border-2 border-gray-200 rounded-xl p-5 hover:border-orange-300 transition-all hover:shadow-md"
                          >
                            {/* Header - Date și Status */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                              <div>
                                <div className="font-semibold text-gray-900 text-lg">
                                  {depDate.toLocaleDateString('ro-RO', { 
                                    day: 'numeric',
                                    month: 'long'
                                  })}
                                  <span className="text-orange-500 mx-2">→</span>
                                  {retDate.toLocaleDateString('ro-RO', { 
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {allPriceOptions.length} opțiuni de cazare
                                </div>
                              </div>
                              
                              {dep.status === 'disponibil' && (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                  ✓ Disponibil
                                </span>
                              )}
                            </div>
                            
                            {/* Price Options - Primele 2 vizibile */}
                            <div className="space-y-2">
                              {allPriceOptions.slice(0, 2).map((option: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                                  <div className="flex-1 pr-3">
                                    <div className="font-medium text-gray-900 text-sm">
                                      {option.type}
                                    </div>
                                    {option.info && (
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {option.info.replace(/\t+/g, ' ').trim()}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-orange-500">
                                      {Math.round(option.price - (option.price * agencyCommission / 100))} {option.currency}
                                    </div>
                                    <div className="text-xs text-gray-400 line-through">
                                      {Math.round(option.price)} {option.currency}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Expand pentru restul opțiunilor */}
                              {hasMultipleOptions && (
                                <details className="group">
                                  <summary className="cursor-pointer list-none">
                                    <div className="flex items-center justify-center gap-2 p-2 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">
                                      <span>Vezi toate opțiunile ({allPriceOptions.length - 2} mai multe)</span>
                                      <span className="group-open:rotate-180 transition-transform inline-block">▼</span>
                                    </div>
                                  </summary>
                                  
                                  <div className="space-y-2 mt-2 pt-2 border-t border-gray-100">
                                    {allPriceOptions.slice(2).map((option: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                                        <div className="flex-1 pr-3">
                                          <div className="font-medium text-gray-900 text-sm">
                                            {option.type}
                                          </div>
                                          {option.info && (
                                            <div className="text-xs text-gray-500 mt-0.5">
                                              {option.info.replace(/\t+/g, ' ').trim()}
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="text-right">
                                          <div className="text-xl font-bold text-orange-500">
                                            {Math.round(option.price - (option.price * agencyCommission / 100))} {option.currency}
                                          </div>
                                          <div className="text-xs text-gray-400 line-through">
                                            {Math.round(option.price)} {option.currency}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="bg-white rounded-lg p-6 shadow-sm sticky top-4">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-600 mb-1">Preț de la</div>
                <div className="text-4xl font-bold text-orange-500">
                  {agencyPrice}
                  <span className="text-lg font-normal">€</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">per persoană</div>
              </div>
              
              <div className="border-t border-b border-gray-200 py-3 my-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Preț public:</span>
                  <span className="font-semibold text-gray-700 line-through">{Math.round(basePrice)} EUR</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Comision agenție ({agencyCommission}%):</span>
                  <span>-{Math.round(basePrice - agencyPrice)} EUR</span>
                </div>
              </div>
              
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors">
                Creează pre-rezervare
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                Pre-rezervarea necesită validare de la J'Info Tours
              </p>
            </div>
            
            {/* Price Options - Toate variantele */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold mb-3">Opțiuni preț</h3>
              <div className="space-y-2 text-sm">
                {circuit.prices.allOptions && circuit.prices.allOptions.length > 0 ? (
                  circuit.prices.allOptions.map((option: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                      <div className="flex-1 pr-2">
                        <div className="font-medium text-gray-900 text-xs">{option.type}</div>
                        {option.info && (
                          <div className="text-xs text-gray-500 mt-0.5">{option.info}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-orange-500">
                          {Math.round(option.price - (option.price * agencyCommission / 100))} {option.currency}
                        </div>
                        <div className="text-xs text-gray-400 line-through">
                          {Math.round(option.price)} {option.currency}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    {circuit.prices.double && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cameră dublă:</span>
                        <span className="font-medium">
                          {Math.round(circuit.prices.double - (circuit.prices.double * agencyCommission / 100))} EUR
                        </span>
                      </div>
                    )}
                    {circuit.prices.single && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cameră single:</span>
                        <span className="font-medium">
                          {Math.round(circuit.prices.single - (circuit.prices.single * agencyCommission / 100))} EUR
                        </span>
                      </div>
                    )}
                    {circuit.prices.triple && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cameră triple:</span>
                        <span className="font-medium">
                          {Math.round(circuit.prices.triple - (circuit.prices.triple * agencyCommission / 100))} EUR
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Quick Info */}
            <div className="bg-gray-100 rounded-lg p-4 text-sm space-y-2">
              <div className="flex items-start gap-2">
                <span>ℹ️</span>
                <span className="text-gray-700">
                  Toate prețurile includ comisionul tău de {agencyCommission}%
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span>📞</span>
                <span className="text-gray-700">
                  Pentru întrebări: contact@jinfotours.ro
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Program complet și detalii - Iframe optimizat */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                📋 Program complet și detalii circuit
              </h2>
              <p className="text-orange-100 text-sm mt-2">
                Program zilnic, servicii incluse/neincluse, excursii opționale și informații practice
              </p>
            </div>
            
            <div className="relative">
              {/* Iframe cu pagina completă */}
              <iframe
                src={circuit.url}
                className="w-full border-0 bg-white"
                style={{ 
                  minHeight: '1500px',
                  height: 'auto'
                }}
                title="Detalii circuit complet"
                loading="lazy"
              />
              
              {/* Link extern */}
              <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  💡 Conținut preluat direct de pe jinfotours.ro
                </span>
                <a 
                  href={circuit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium transition-colors text-sm"
                >
                  <span>🔗 Deschide pagina completă</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}