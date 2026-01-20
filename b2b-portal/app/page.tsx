'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Circuit {
  id: string;
  name: string;
  slug: string;
  continent: string;
  nights: string;
  mainImage: string;
  prices: {
    double: number | null;
    single: number | null;
    allOptions: any[];
  };
  departures: any[];
}

export default function HomePage() {
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [nightsFilter, setNightsFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, price-asc, price-desc, popular
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Load circuits
  useEffect(() => {
    async function loadCircuits() {
      try {
        const response = await fetch('/api/circuits');
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 API Response:', {
            total: data.circuits?.length,
            africa: data.circuits?.filter((c: any) => c.continent === 'africa').length,
            oceania: data.circuits?.filter((c: any) => c.continent === 'oceania').length
          });
          setCircuits(data.circuits || []);
        }
      } catch (error) {
        console.error('Error loading circuits:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCircuits();
  }, []);
  
  // Stats
  const stats = useMemo(() => {
    const continents = new Set(circuits.map(c => c.continent));
    const totalDepartures = circuits.reduce((sum, c) => sum + (c.departures?.length || 0), 0);
    const avgPrice = circuits.reduce((sum, c) => sum + (c.prices.double || 0), 0) / circuits.length;
    
    return {
      totalCircuits: circuits.length,
      continents: continents.size,
      departures: totalDepartures,
      avgPrice: Math.round(avgPrice)
    };
  }, [circuits]);
  
  // Filtered & Sorted Circuits
  const filteredCircuits = useMemo(() => {
    let filtered = circuits;
    
    console.log('🔍 Filtering:', {
      total: circuits.length,
      selectedContinent,
      searchQuery,
      priceRange,
      nightsFilter
    });
    
    // Search
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.continent.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Continent
    if (selectedContinent !== 'all') {
      const beforeFilter = filtered.length;
      filtered = filtered.filter(c => 
        c.continent.toLowerCase() === selectedContinent.toLowerCase()
      );
      console.log(`  After continent filter (${selectedContinent}):`, {
        before: beforeFilter,
        after: filtered.length,
        sample: filtered.slice(0, 3).map(c => c.name)
      });
    }
    
    // Price Range
    filtered = filtered.filter(c => {
      const price = c.prices.double || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });
    
    // Nights
    if (nightsFilter !== 'all') {
      filtered = filtered.filter(c => {
        const nights = parseInt(c.nights.match(/\d+/)?.[0] || '0');
        if (nightsFilter === '5-7') return nights >= 5 && nights <= 7;
        if (nightsFilter === '8-10') return nights >= 8 && nights <= 10;
        if (nightsFilter === '11+') return nights >= 11;
        return true;
      });
    }
    
    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price-asc') return (a.prices.double || 0) - (b.prices.double || 0);
      if (sortBy === 'price-desc') return (b.prices.double || 0) - (a.prices.double || 0);
      if (sortBy === 'popular') return (b.departures?.length || 0) - (a.departures?.length || 0);
      return 0;
    });
    
    return filtered;
  }, [circuits, searchQuery, selectedContinent, priceRange, nightsFilter, sortBy]);
  
  // Reset Filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedContinent('all');
    setPriceRange([0, 10000]);
    setNightsFilter('all');
    setSortBy('name');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Se încarcă circuitele...</p>
        </div>
      </div>
    );
  }
  
  const agencyCommission = 10;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold">
                <span className="text-orange-500">J'INFO</span>
                <span className="text-blue-600"> B2B</span>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                Portal Agenții
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                📞 Contact
              </button>
              <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">
                Cont Agenție
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-6">Portal B2B - Circuite Turistice</h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.totalCircuits}</div>
              <div className="text-sm opacity-90">Circuite disponibile</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.continents}</div>
              <div className="text-sm opacity-90">Continente</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.departures}</div>
              <div className="text-sm opacity-90">Plecări disponibile</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{agencyCommission}%</div>
              <div className="text-sm opacity-90">Comision agenție</div>
            </div>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          {/* Search Bar */}
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="🔍 Caută după destinație sau țară..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pr-12 text-lg border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Continent Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🌍 Continent
              </label>
              <select
                value={selectedContinent}
                onChange={(e) => setSelectedContinent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-gray-900 font-medium bg-white"
              >
                <option value="all">Toate continentele</option>
                <option value="europa">Europa</option>
                <option value="africa">Africa</option>
                <option value="asia">Asia</option>
                <option value="america">America</option>
                <option value="oceania">Oceania</option>
              </select>
            </div>
            
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💰 Preț (EUR)
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 text-center">
                  0 - {priceRange[1]} EUR
                </div>
              </div>
            </div>
            
            {/* Nights Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🌙 Nopți
              </label>
              <select
                value={nightsFilter}
                onChange={(e) => setNightsFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-gray-900 font-medium bg-white"
              >
                <option value="all">Toate</option>
                <option value="5-7">5-7 nopți</option>
                <option value="8-10">8-10 nopți</option>
                <option value="11+">11+ nopți</option>
              </select>
            </div>
            
            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 Sortare
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-gray-900 font-medium bg-white"
              >
                <option value="name">Nume (A-Z)</option>
                <option value="price-asc">Preț (crescător)</option>
                <option value="price-desc">Preț (descrescător)</option>
                <option value="popular">Popularitate</option>
              </select>
            </div>
          </div>
          
          {/* Filter Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{filteredCircuits.length}</span> circuite găsite
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                🔄 Resetează filtre
              </button>
              
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 text-sm ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} transition-colors`}
                >
                  ▦ Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} transition-colors`}
                >
                  ☰ List
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Results */}
        {filteredCircuits.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Niciun circuit găsit</h3>
            <p className="text-gray-600 mb-6">Încearcă să modifici filtrele de căutare</p>
            <button
              onClick={resetFilters}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Resetează toate filtrele
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredCircuits.map((circuit) => {
              const basePrice = circuit.prices.double || 0;
              const agencyPrice = Math.round(basePrice - (basePrice * agencyCommission / 100));
              const savings = Math.round(basePrice - agencyPrice);
              const nightsCount = circuit.nights.match(/\d+/)?.[0] || 'N/A';
              
              if (viewMode === 'list') {
                return (
                  <Link
                    key={circuit.id}
                    href={`/circuits/${circuit.slug}`}
                    className="block bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group"
                  >
                    <div className="flex">
                      <div className="relative w-64 h-48 flex-shrink-0">
                        {circuit.mainImage && (
                          <Image
                            src={circuit.mainImage}
                            alt={circuit.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        )}
                        <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          {circuit.continent}
                        </div>
                      </div>
                      
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-500 transition-colors">
                            {circuit.name}
                          </h3>
                          
                          <div className="flex flex-wrap gap-3 mb-4">
                            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                              🌙 {nightsCount} nopți
                            </span>
                            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                              📅 {circuit.departures?.length || 0} plecări
                            </span>
                            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                              💰 {circuit.prices.allOptions?.length || 0} opțiuni preț
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-sm text-gray-500 line-through">
                              Preț public: {Math.round(basePrice)} EUR
                            </div>
                            <div className="text-3xl font-bold text-orange-500">
                              {agencyPrice} EUR
                            </div>
                            <div className="text-sm text-green-600 font-medium">
                              Economie: {savings} EUR ({agencyCommission}%)
                            </div>
                          </div>
                          
                          <button className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">
                            Vezi detalii →
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              }
              
              return (
                <Link
                  key={circuit.id}
                  href={`/circuits/${circuit.slug}`}
                  className="block bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group"
                >
                  <div className="relative h-56">
                    {circuit.mainImage && (
                      <Image
                        src={circuit.mainImage}
                        alt={circuit.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      {circuit.continent}
                    </div>
                    
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-900 shadow-lg">
                      🌙 {nightsCount} nopți
                    </div>
                    
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-bold text-lg line-clamp-2 drop-shadow-lg">
                        {circuit.name}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        📅 {circuit.departures?.length || 0} plecări
                      </span>
                      <span className="flex items-center gap-1">
                        💰 {circuit.prices.allOptions?.length || 0} opțiuni
                      </span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Preț public:</span>
                        <span className="text-sm text-gray-500 line-through">
                          {Math.round(basePrice)} EUR
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-semibold text-gray-900">Preț agenție:</span>
                        <span className="text-2xl font-bold text-orange-500">
                          {agencyPrice} EUR
                        </span>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                        <span className="text-sm text-green-700 font-medium">
                          💚 Economisești {savings} EUR ({agencyCommission}%)
                        </span>
                      </div>
                    </div>
                    
                    <button className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 font-medium shadow-lg group-hover:shadow-xl">
                      Vezi detalii și pre-rezervă →
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            © 2026 J'Info Tours - Portal B2B pentru Agenții de Turism
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Toate prețurile includ comisionul agenției de {agencyCommission}%
          </p>
        </div>
      </footer>
    </div>
  );
}