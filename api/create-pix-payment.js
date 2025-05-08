const axios = require('axios');

async function createPix(amount, description, payerEmail) {
  try {
    const response = await axios.post('https://api.mercadopago.com/v1/payments', {
      transaction_amount: amount,
      description: description,
      payment_method_id: 'pix',
      payer: {
        email: payerEmail
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    // O QR code está na resposta, geralmente em point_of_interaction.transaction_data.qr_code
    const qrCode = response.data.point_of_interaction.transaction_data.qr_code;
    const qrCodeBase64 = response.data.point_of_interaction.transaction_data.qr_code_base64; // Para exibir como imagem
    return { qrCode, qrCodeBase64 };
  } catch (error) {
    console.error('Erro ao criar Pix:', error.response?.data || error.message);
    throw new Error('Falha ao gerar QR code Pix: ' + (error.response?.data?.message || error.message));
  }
}

// Exemplo de uso em uma rota (usando Express)
const express = require('express');
const app = express();

app.post('/create-pix', async (req, res) => {
  try {
    const { amount, description, email } = req.body;
    const pix = await createPix(amount, description, email);
    res.json(pix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
