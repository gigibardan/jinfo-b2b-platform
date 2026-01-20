// components/circuits/CircuitCard.tsx
import Link from 'next/link';
import Image from 'next/image';

interface CircuitCardProps {
  circuit: {
    id: string;
    name: string;
    slug: string;
    nights: string;
    mainImage: string;
    prices: {
      double: number | null;
      single: number | null;
    };
    departures: any[];
  };
  agencyCommission?: number; // Default 10%
}

export default function CircuitCard({ circuit, agencyCommission = 10 }: CircuitCardProps) {
  // Calculează prețul pentru agenție (cu comision)
  const basePrice = circuit.prices.double || 0;
  const agencyPrice = basePrice - (basePrice * agencyCommission / 100);
  
  // Extrage doar numărul de nopți
  const nightsNumber = circuit.nights?.match(/\d+/)?.[0] || '';
  
  // Găsește prima plecare disponibilă
  const firstDeparture = circuit.departures.find((d: any) => d.status === 'disponibil');
  const departureDate = firstDeparture ? new Date(firstDeparture.departureDate) : null;
  
  return (
    <Link href={`/circuits/${circuit.slug}`}>
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full flex flex-col border border-gray-100">
        {/* Image */}
        <div className="relative h-48 bg-gray-100">
          {circuit.mainImage && (
            <Image
              src={circuit.mainImage}
              alt={circuit.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
          
          {/* Badge nopți */}
          {nightsNumber && (
            <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
              {nightsNumber} nopți
            </div>
          )}
          
          {/* Badge plecări */}
          {circuit.departures.length > 0 && (
            <div className="absolute bottom-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
              {circuit.departures.length} plecări
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 min-h-[3rem] text-base">
            {circuit.name}
          </h3>
          
          {/* Prima plecare */}
          {departureDate && (
            <div className="text-xs text-gray-600 mb-3 flex items-center gap-1">
              <span>📅</span>
              <span>Prima plecare: {departureDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
            </div>
          )}
          
          <div className="mt-auto">
            {/* Preț */}
            {basePrice > 0 ? (
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Preț public:</span>
                  <span className="text-sm text-gray-500 line-through">
                    {Math.round(basePrice)} EUR
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-600 font-medium">Preț agenție:</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-orange-500">
                      {Math.round(agencyPrice)}
                    </span>
                    <span className="text-sm text-gray-600 ml-1">EUR</span>
                  </div>
                </div>
                <div className="text-xs text-green-600 font-medium text-right">
                  Economie: {Math.round(basePrice - agencyPrice)} EUR
                </div>
              </div>
            ) : (
              <div className="mb-3 text-center py-2">
                <span className="text-sm text-gray-500">Preț la cerere</span>
              </div>
            )}
            
            {/* Button */}
            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg font-semibold transition-colors text-sm">
              Vezi detalii →
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}