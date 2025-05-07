const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');
const app = express();

// Configurar CORS para aceitar requisições do frontend
app.use(cors({
  origin: '[invalid url, do not cite]'
}));

// Configurar parsing de JSON
app.use(express.json());

// Configurar credenciais do Mercado Pago
mercadopago.configure({
  access_token: 'APP_USR-370934188085811-050219-1dde9cca4db5f13738f043119fdb7c30-22052021'
}));

// Endpoint de teste para verificar se o backend está ativo
app.get('/health', (req, res) => {
  res.json({ status: 'Backend está funcionando!' });
});

// Endpoint para criar o Pix
app.post('/create-pix', async (req, res) => {
  const { amount, description, payer } = req.body;

  try {
    const paymentData = {
      transaction_amount: amount,
      description: description || 'Compra Wepink',
      payment_method_id: 'pix',
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: {
          type: payer.identification.type,
          number: payer.identification.number
        }
      },
      notification_url: '[invalid url, do not cite]'
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

// Endpoint para verificar o status do pagamento
app.get('/payment-status/:paymentId', async (req, res) => {
  const { paymentId } = req.params;

  try {
    const payment = await mercadopago.payment.get(paymentId);
    res.json({ status: payment.body.status });
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    res.status(500).json({ error: 'Erro ao verificar o status do pagamento: ' + error.message });
  }
});

// Rota para receber notificações (webhook)
app.post('/webhook', (req, res) => {
  console.log('Webhook recebido:', req.body);
  res.status(200).send('Webhook recebido');
});

// Iniciar o servidor
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando na porta', process.env.PORT || 3000);
});
