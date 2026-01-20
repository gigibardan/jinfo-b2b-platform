const axios = require('axios');
const cheerio = require('cheerio');

async function testCircuit() {
  const url = 'https://www.jinfotours.ro/circuite/detalii/acfranta';
  
  console.log('🔍 Testing:', url, '\n');
  
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  
  // 1. Verifică nights
  const nights = $('.no').first().text().trim();
  console.log('📅 Nights găsit:', nights);
  
  // 2. Verifică toate tabelele
  console.log('\n📊 Tabele găsite:');
  let tableCount = 0;
  $('table').each((i, table) => {
    tableCount++;
    console.log(`\nTable ${tableCount}:`);
    $(table).find('tr').each((j, row) => {
      const text = $(row).text().trim();
      if (text.includes('2026') || text.includes('disponibil')) {
        console.log(`  Row ${j}:`, text.substring(0, 100));
      }
    });
  });
  
  // 3. Extrage TOATE datele
  const allDates = [];
  $('table tr').each((i, row) => {
    const text = $(row).text();
    const dates = text.match(/\d{2}\.\d{2}\.\d{4}/g);
    if (dates) {
      dates.forEach(date => {
        if (!allDates.includes(date)) {
          allDates.push(date);
        }
      });
    }
  });
  
  console.log('\n📅 Date UNICE găsite:', allDates.length);
  allDates.forEach(d => console.log('  -', d));
  
  // 4. Verifică structura tabelului
  console.log('\n🔍 Analiză structură tabel:');
  const firstTable = $('table').first();
  console.log('Thead:', firstTable.find('thead th').map((i, el) => $(el).text().trim()).get());
  
  console.log('\nPrimele 3 rows din tbody:');
  firstTable.find('tbody tr').slice(0, 3).each((i, row) => {
    const cells = $(row).find('td').map((j, cell) => $(cell).text().trim()).get();
    console.log(`  Row ${i}:`, cells);
  });
}

testCircuit().catch(console.error);