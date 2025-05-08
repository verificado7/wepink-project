const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.get('/payment.html', (req, res) => {
  console.log('Servindo payment.html');
  res.sendFile(path.join(__dirname, 'payment.html'));
});

app.post('/create-pix', async (req, res) => {
  try {
    const { amount, description, email } = req.body;

    if (!amount || amount <= 0) {
      throw new Error('O valor da transação é obrigatório e deve ser maior que zero.');
    }
    if (!description) {
      throw new Error('A descrição é obrigatória.');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('O e-mail é obrigatório e deve ser válido.');
    }

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

    const response = await axios.post('[invalid url, do not cite] {
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'payment.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
