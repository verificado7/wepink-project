async function generatePix() {
  const name = document.getElementById('pix-payer-name').value;
  const cpf = document.getElementById('pix-payer-cpf').value;
  const email = document.getElementById('pix-email-input').value;
  const amount = 100; // Ajuste conforme necessário

  try {
    const response = await fetch('https://wepink-backend.onrender.com/create-pix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        payer: {
          email: email,
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' ') || 'Sobrenome',
          identification: {
            type: 'CPF',
            number: cpf
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error('Erro na resposta do servidor: ' + response.statusText);
    }

    const data = await response.json();
    console.log('Pix gerado com sucesso:', data);
    // Exiba o QR code ou código Pix na interface
  } catch (error) {
    console.error('Erro ao gerar Pix:', error);
    alert('Erro ao gerar Pix: ' + error.message);
  }
}
