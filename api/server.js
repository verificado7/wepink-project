const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/create-pix', async (req, res) => {
  try {
    const { amount, description, email } = req.body;

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

    const response = await axios.post('https://api.mercadopago.com/v1/payments', {
      transaction_amount: amount,
      description: description,
      payment_method_id: 'pix',
      payer: { email: email }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      }
    });

    const qrCode = response.data.point_of_interaction.transaction_data.qr_code;
    const qrCodeBase64 = response.data.point_of_interaction.transaction_data.qr_code_base64;
    res.json({ qrCode, qrCodeBase64 });
  } catch (error) {
    console.error('Erro ao criar Pix:', error.response?.data || error.message);
    res.status(500).json({ error: 'Falha ao gerar QR code Pix: ' + (error.response?.data?.message || error.message) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
