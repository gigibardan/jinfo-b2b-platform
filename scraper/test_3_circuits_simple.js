const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');
const fs = require('fs');

// Configurație pentru testare
const TEST_CIRCUITS = [
    { id: '1355', name: 'Ecuador - Galapagos', continent: 'america' },
    { id: '1278', name: 'Alaska', continent: 'america' },
    { id: '1293', name: 'Japonia - Coreea', continent: 'asia' }
];

let browser = null;
let page = null;

// Inițializează browser-ul
async function initBrowser() {
    if (!browser) {
        console.log('🚀 Pornesc browser Playwright...\n');
        browser = await chromium.launch({ 
            headless: true,  // headless pentru debugging mai rapid
            timeout: 120000 
        });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
        page = await context.newPage();
    }
}

// Extractor Prețuri - IDENTIC CU SCRIPTUL PRINCIPAL
async function extractAllPrices(url, circuitName) {
    try {
        await initBrowser();
        console.log(`      💰 Extrag prețuri din ${url}...`);
        
        await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
        await page.waitForTimeout(2000);
        
        // DEBUG - verifică ce selectori există
        const debugInfo = await page.evaluate(() => {
            return {
                hasServiceRows: document.querySelectorAll('.service-cell-row').length,
                hasPriceRows: document.querySelectorAll('.price-row').length,
                hasTables: document.querySelectorAll('table').length,
                hasOfferTab: !!document.querySelector('a[href="#offer"]'),
                allClasses: Array.from(document.querySelectorAll('[class*="price"], [class*="service"]')).map(el => el.className).slice(0, 10)
            };
        });
        
        console.log(`  🔍 Debug info:`, debugInfo);
        
        // Click pe tab oferte dacă există
        const hasOfferTab = debugInfo.hasOfferTab;
        if (hasOfferTab) {
            await page.click('a[href="#offer"]');
            await page.waitForTimeout(2000);
        }

        const result = await page.evaluate(() => {
            const rows = document.querySelectorAll('.service-cell-row');
            
            console.log(`Found ${rows.length} service-cell-row elements`);
            
            // Dacă nu găsim rows cu selectorul standard, încearcă altele
            if (rows.length === 0) {
                console.log('No .service-cell-row found! Trying alternative selectors...');
                
                // Încearcă să găsești orice element cu "service" sau "price"
                const alternatives = {
                    priceRows: document.querySelectorAll('.price-row').length,
                    serviceCells: document.querySelectorAll('[class*="service"]').length,
                    priceCells: document.querySelectorAll('[class*="price"]').length,
                    tables: document.querySelectorAll('table tr').length
                };
                
                console.log('Alternatives:', alternatives);
                
                return {
                    double: null,
                    single: null,
                    triple: null,
                    child: null,
                    allOptions: [],
                    debug: alternatives
                };
            }
            
            const priceData = {
                double: null,
                single: null,
                triple: null,
                child: null,
                allOptions: []
            };

            rows.forEach(row => {
                const nameEl = row.querySelector('.service-name');
                const priceEl = row.querySelector('.price .value');
                const currEl = row.querySelector('.price .curr');
                const infoEl = row.querySelector('.service-info p');

                if (nameEl && priceEl) {
                    const name = nameEl.textContent.trim().toLowerCase();
                    let priceText = priceEl.textContent.trim();
                    
                    // STEP 1: Elimină virgula (separator zecimale greșit)
                    priceText = priceText.replace(',', '');
                    
                    // STEP 2: Elimină orice nu e cifră
                    let cleaned = priceText.replace(/[^\d]/g, '').trim();
                    
                    // STEP 3: Elimină ultimele 2 zerouri (zecimale inutile)
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

                    priceData.allOptions.push(data);

                    // Mapare pe categorii
                    if (name.includes('persoana in camera dubla') || name.includes('persoană în cameră dublă')) {
                        priceData.double = finalPrice;
                    } else if (name.includes('single') || name.includes('loc in camera')) {
                        priceData.single = finalPrice;
                    } else if (name.includes('copil') || name.includes('child')) {
                        // CHILD FIRST - înainte de triple pentru a nu se suprapune
                        priceData.child = finalPrice;
                    } else if (name.includes('camera dubla') && (name.includes('2 adulti') || name.includes('2 adulți'))) {
                        if (!priceData.double) priceData.double = Math.round(finalPrice / 2);
                    } else if (name.includes('tripla') || name.includes('triplă') || name.includes('triple') || (name.includes('3 persoane') && name.includes('camera'))) {
                        if (name.includes('3 persoane')) {
                            priceData.triple = Math.round(finalPrice / 3);
                        } else {
                            priceData.triple = finalPrice;
                        }
                    }
                }
            });
            
            return priceData;
        });

        return result;

    } catch (error) {
        console.error(`      ❌ Eroare: ${error.message}`);
        return { allOptions: [], double: null, single: null, triple: null, child: null };
    }
}

// Procesare un circuit
async function testCircuit(circuit) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 TESTEZ: ${circuit.name} [${circuit.id}]`);
    console.log('='.repeat(70));

    try {
        // Obținem slug-ul
        const listUrl = `https://www.jinfotours.ro/circuitele-noastre/${circuit.continent}`;
        let slug = null;
        
        try {
            const listRes = await axios.get(listUrl, { timeout: 30000 });
            const $list = cheerio.load(listRes.data);
            
            $list('.acqua-tour-list-complete a').each((i, el) => {
                const title = $list(el).find('.destination').text().trim();
                const href = $list(el).attr('href');
                
                if (title === circuit.name && href) {
                    slug = href.split('/').pop();
                    return false;
                }
            });
            
            // Partial match dacă nu găsim exact
            if (!slug) {
                const nameWords = circuit.name.toLowerCase().split(' ').filter(w => w.length > 3);
                
                $list('.acqua-tour-list-complete a').each((i, el) => {
                    const title = $list(el).find('.destination').text().trim().toLowerCase();
                    const href = $list(el).attr('href');
                    
                    const matchCount = nameWords.filter(word => title.includes(word)).length;
                    if (matchCount >= Math.min(2, nameWords.length) && href) {
                        slug = href.split('/').pop();
                        console.log(`  ℹ️ Match partial: "${circuit.name}" → "${title}"`);
                        return false;
                    }
                });
            }
        } catch (err) {
            console.error(`  ⚠️ Nu pot obține lista: ${err.message}`);
        }

        if (!slug) {
            slug = circuit.name.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');
            console.log(`  ℹ️ Slug generat: ${slug}`);
        }

        const detailsUrl = `https://www.jinfotours.ro/circuite/detalii/${slug}`;
        console.log(`  🔗 URL: ${detailsUrl}`);

        // Extrage prețuri cu Playwright
        const prices = await extractAllPrices(detailsUrl, circuit.name);

        // Afișare rezultate
        console.log(`\n  📊 PREȚURI EXTRASE:`);
        console.log(`    Double: ${prices.double || 'N/A'} EUR`);
        console.log(`    Single: ${prices.single || 'N/A'} EUR`);
        console.log(`    Triple: ${prices.triple || 'N/A'} EUR`);
        console.log(`    Child: ${prices.child || 'N/A'} EUR`);
        console.log(`\n  📋 TOATE OPȚIUNILE (${prices.allOptions.length}):`);
        
        prices.allOptions.forEach((opt, idx) => {
            console.log(`    ${idx + 1}. ${opt.type}: ${opt.price} ${opt.currency}`);
        });

        return {
            circuit: circuit.name,
            url: detailsUrl,
            prices: prices,
            success: prices.allOptions.length > 0
        };

    } catch (error) {
        console.error(`  ❌ EROARE: ${error.message}`);
        return {
            circuit: circuit.name,
            url: null,
            prices: null,
            success: false,
            error: error.message
        };
    }
}

// Funcția principală
async function main() {
    console.log('🧪 TEST SCRAPER - 3 CIRCUITE\n');
    
    const results = [];

    for (const circuit of TEST_CIRCUITS) {
        const result = await testCircuit(circuit);
        results.push(result);
        
        console.log(`\n  ⏳ Pauză 3 secunde...\n`);
        await new Promise(r => setTimeout(r, 3000));
    }

    if (browser) {
        await browser.close();
        console.log('🔒 Browser închis\n');
    }

    // Salvare rezultate
    fs.writeFileSync('./test_3_circuits_results.json', JSON.stringify({
        testedAt: new Date().toISOString(),
        results: results
    }, null, 2));

    // Raport final
    console.log('='.repeat(70));
    console.log('✅ TEST FINALIZAT');
    console.log('='.repeat(70));
    
    const successful = results.filter(r => r.success).length;
    console.log(`\n📊 REZULTATE: ${successful}/${results.length} circuite cu succes`);
    
    results.forEach((r, idx) => {
        const status = r.success ? '✅' : '❌';
        const priceCount = r.prices ? r.prices.allOptions.length : 0;
        console.log(`  ${status} ${r.circuit}: ${priceCount} prețuri`);
    });
    
    console.log(`\n💾 Rezultate salvate în: test_3_circuits_results.json`);
}

main().catch(console.error);