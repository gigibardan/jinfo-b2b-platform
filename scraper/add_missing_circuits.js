const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');
const fs = require('fs');

// Circuitele care lipsesc - doar Oceania
const MISSING_CIRCUITS = [
  { id: 'oceania_manual_papua', slug: 'papua-noua-guinee', name: 'Papua Noua Guinee', continent: 'oceania' },
  { id: 'oceania_manual_tahiti', slug: 'tahiti', name: 'Tahiti', continent: 'oceania' }
];

let browser = null;
let page = null;

async function initBrowser() {
  if (!browser) {
    console.log('🚀 Pornesc browser...\n');
    browser = await chromium.launch({ headless: true, timeout: 120000 });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    page = await context.newPage();
  }
}

async function extractAllPrices(url) {
  try {
    await initBrowser();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(2000);
    
    const hasOfferTab = await page.evaluate(() => !!document.querySelector('a[href="#offer"]'));
    if (hasOfferTab) {
      await page.click('a[href="#offer"]');
      await page.waitForTimeout(2000);
    }

    return await page.evaluate(() => {
      const rows = document.querySelectorAll('.service-cell-row');
      const result = { double: null, single: null, triple: null, child: null, allOptions: [] };

      rows.forEach(row => {
        const nameEl = row.querySelector('.service-name');
        const priceEl = row.querySelector('.price .value');
        const currEl = row.querySelector('.price .curr');
        const infoEl = row.querySelector('.service-info p');

        if (nameEl && priceEl) {
          const name = nameEl.textContent.trim().toLowerCase();
          let priceText = priceEl.textContent.trim();
          
          // STEP 1: Elimină virgula
          priceText = priceText.replace(',', '');
          
          // STEP 2: Elimină orice nu e cifră
          let cleaned = priceText.replace(/[^\d]/g, '').trim();
          
          // STEP 3: Elimină ultimele 2 zerouri
          if (cleaned.length > 2 && cleaned.endsWith('00')) {
            cleaned = cleaned.slice(0, -2);
          }
          
          let finalPrice = parseFloat(cleaned) || 0;

          const data = {
            type: nameEl.textContent.trim(),
            price: finalPrice,
            currency: currEl ? currEl.textContent.trim() : 'EUR',
            info: (infoEl ? infoEl.textContent.trim() : '')
              .replace(/[\t\n\r]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
          };

          result.allOptions.push(data);

          // Mapare categorii - CHILD FIRST
          if (name.includes('persoana in camera dubla') || name.includes('persoană în cameră dublă')) {
            result.double = finalPrice;
          } else if (name.includes('single') || name.includes('loc in camera')) {
            result.single = finalPrice;
          } else if (name.includes('copil') || name.includes('child')) {
            result.child = finalPrice;
          } else if (name.includes('camera dubla') && (name.includes('2 adulti') || name.includes('2 adulți'))) {
            if (!result.double) result.double = Math.round(finalPrice / 2);
          } else if (name.includes('tripla') || name.includes('triplă') || name.includes('triple') || (name.includes('3 persoane') && name.includes('camera'))) {
            if (name.includes('3 persoane')) {
              result.triple = Math.round(finalPrice / 3);
            } else {
              result.triple = finalPrice;
            }
          }
        }
      });
      
      return result;
    });
  } catch (error) {
    console.error(`    ⚠️ Eroare extragere prețuri: ${error.message}`);
    return { allOptions: [], double: null, single: null, triple: null, child: null };
  }
}

async function addCircuit(circuit) {
  try {
    console.log(`\n➕ Adaug: ${circuit.name} (${circuit.slug})`);
    
    const detailsUrl = `https://www.jinfotours.ro/circuite/detalii/${circuit.slug}`;
    
    console.log(`  📍 Accesez ${detailsUrl}...`);
    const response = await axios.get(detailsUrl, { timeout: 30000 });
    const $ = cheerio.load(response.data);

    // Gallery
    const gallery = [];
    $('img[src*="items_images"]').each((i, img) => {
      const src = $(img).attr('src');
      if (src && !gallery.includes(src)) {
        gallery.push(src.trim());
      }
    });
    console.log(`  🖼️  ${gallery.length} imagini`);

    // Prețuri
    const prices = await extractAllPrices(detailsUrl);
    console.log(`  💰 ${prices.allOptions.length} opțiuni preț`);

    // Plecări
    const departureDates = new Set();
    const departurePeriods = [];
    
    const firstDataRow = $('table tbody tr').first();
    const periodCell = firstDataRow.find('td').eq(1);
    
    if (periodCell.length > 0) {
      const text = periodCell.text();
      const periodMatches = text.match(/(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/g);
      
      if (periodMatches) {
        periodMatches.forEach(period => {
          const dates = period.match(/\d{2}\.\d{2}\.\d{4}/g);
          if (dates && dates.length === 2) {
            const startDate = dates[0];
            const endDate = dates[1];
            
            if (!departureDates.has(startDate)) {
              departureDates.add(startDate);
              departurePeriods.push({ start: startDate, end: endDate });
            }
          }
        });
      }
    }
    
    // Fallback
    if (departureDates.size === 0) {
      $('table tr').each((i, row) => {
        const text = $(row).text();
        const dates = text.match(/\d{2}\.\d{2}\.\d{4}/g);
        if (dates) {
          dates.forEach(date => departureDates.add(date));
        }
      });
    }
    
    console.log(`  📅 ${departureDates.size} plecări`);

    // Nights
    let nightsNum = 7;
    const priceCell = $('table tbody tr').first().find('td').last();
    const nightsMatch = priceCell.text().match(/(\d+)\s*nopt/i);
    if (nightsMatch) {
      nightsNum = parseInt(nightsMatch[1]);
    }

    // Convert to departures array
    const departures = [];
    
    if (departurePeriods.length > 0) {
      departurePeriods.forEach(period => {
        const [day, month, year] = period.start.split('.');
        const departureDate = `${year}-${month}-${day}`;
        
        const [endDay, endMonth, endYear] = period.end.split('.');
        const returnDate = `${endYear}-${endMonth}-${endDay}`;
        
        departures.push({
          departureDate: departureDate,
          returnDate: returnDate,
          roomType: 'double',
          price: prices.double || 0,
          status: 'disponibil'
        });
      });
    } else {
      Array.from(departureDates).forEach(dateStr => {
        const [day, month, year] = dateStr.split('.');
        const departureDate = `${year}-${month}-${day}`;
        
        const returnDate = new Date(departureDate);
        returnDate.setDate(returnDate.getDate() + nightsNum);
        
        departures.push({
          departureDate: departureDate,
          returnDate: returnDate.toISOString().split('T')[0],
          roomType: 'double',
          price: prices.double || 0,
          status: 'disponibil'
        });
      });
    }

    const newCircuit = {
      id: circuit.id,
      name: circuit.name,
      slug: circuit.slug,
      continent: circuit.continent,
      url: detailsUrl,
      title: $('h1').first().text().trim() || circuit.name,
      nights: `${nightsNum} nopti`,
      mainImage: gallery[0] || null,
      gallery: gallery,
      prices: prices,
      departures: departures,
      shortDescription: ($('.description p').first().text().trim() || '').substring(0, 200) + '...',
      lastScraped: new Date().toISOString()
    };

    console.log(`  ✅ Circuit creat cu succes!`);
    return newCircuit;
    
  } catch (error) {
    console.error(`  ❌ Eroare: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('➕ ADAUGĂ CIRCUITE LIPSĂ (Papua & Tahiti)\n');

  // Încarcă datele existente
  if (!fs.existsSync('./circuits_data_complete.json')) {
    console.error('❌ Nu găsesc circuits_data_complete.json!');
    console.log('Rulează mai întâi: node scraper_v2_optimized.js');
    return;
  }

  const data = JSON.parse(fs.readFileSync('./circuits_data_complete.json', 'utf8'));
  
  console.log(`📦 Circuite existente: ${data.circuits.length}`);
  console.log(`➕ Circuite de adăugat: ${MISSING_CIRCUITS.length}\n`);

  let added = 0;
  let failed = 0;

  for (const circuit of MISSING_CIRCUITS) {
    // Verifică dacă nu există deja
    const exists = data.circuits.find(c => c.slug === circuit.slug);
    if (exists) {
      console.log(`⏭️  ${circuit.name} există deja, skip.`);
      continue;
    }

    const newCircuit = await addCircuit(circuit);
    
    if (newCircuit) {
      data.circuits.push(newCircuit);
      added++;
    } else {
      failed++;
    }
    
    await new Promise(r => setTimeout(r, 3000));
  }

  if (browser) await browser.close();

  // Update meta
  data.meta.totalCircuits = data.circuits.length;
  data.meta.lastUpdated = new Date().toISOString();
  data.meta.addedCircuits = added;

  // Salvează
  fs.writeFileSync('./circuits_data_complete.json', JSON.stringify(data, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('✅ GATA!');
  console.log('='.repeat(60));
  console.log(`➕ Adăugate: ${added}`);
  console.log(`❌ Eșuate: ${failed}`);
  console.log(`📦 Total circuite: ${data.circuits.length}`);
  console.log(`💾 Salvat în: circuits_data_complete.json`);
  console.log('='.repeat(60));
}

main().catch(console.error);