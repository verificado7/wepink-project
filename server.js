const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');
const app = express();

// Configurar CORS para aceitar requisições do frontend
app.use(cors({
  origin: 'https://wepink-project.onrender.com'
}));

// Configurar parsing de JSON
app.use(express.json());

// Configurar credenciais do Mercado Pago
mercadopago.configure({
  access_token: 'APP_USR-370934188085811-050219-1dde9cca4db5f13738f043119fdb7c30-22052021'
}));

// Endpoint para criar o Pix
app.post('/create-pix', async (req, res) => {
  const { amount, payer } = req.body;

  try {
    const paymentData = {
      transaction_amount: amount,
      description: 'Compra Wepink',
      payment_method_id: 'pix',
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: {
          type: 'CPF',
          number: payer.identification.number
        }
      }
    };

    const payment = await mercadopago.payment.create(paymentData);
    const qrCodeBase64 = payment.body.point_of_interaction.transaction_data.qr_code_base64;
    const qrCode = payment.body.point_of_interaction.transaction_data.qr_code;

    res.json({
      payment_id: payment.body.id,
      qr_code_base64: qrCodeBase64,
      qr_code: qrCode
    });
  } catch (error) {
    console.error('Erro ao gerar Pix:', error);
    res.status(500).json({ error: 'Erro ao gerar Pix: ' + error.message });
  }
});

// Iniciar o servidor
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando na porta', process.env.PORT || 3000);
});
