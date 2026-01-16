
async function checkTypes() {
  try {
    const response = await fetch('https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/');
    const data = await response.json();

    if (data && data.listaDezenas) {
      console.log('Sample Dezenas:', data.listaDezenas);
      console.log('Type of first element:', typeof data.listaDezenas[0]);
    } else {
      console.log('No data found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTypes();
