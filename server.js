const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve arquivos estáticos da raiz

// Rota para servir payment.html
app.get('/payment.html', (req, res) => {
  console.log('Servindo payment.html');
  res.sendFile(path.join(__dirname, 'payment.html'));
});

// Rota para servir confirmation.html
app.get('/confirmation.html', (req, res) => {
  console.log('Servindo confirmation.html');
  res.sendFile(path.join(__dirname, 'confirmation.html'));
});

// Rota para servir admin.html
app.get('/admin.html', (req, res) => {
  console.log('Servindo admin.html');
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Endpoint para criar QR code Pix
app.post('/create-pix', async (req, res) => {
  try {
    const { amount, description, email } = req.body;

    // Validações
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

// Rota padrão para a raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'payment.html'));
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
