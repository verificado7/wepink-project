const express = require('express');
const mercadopago = require('mercadopago');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Configuração do Mercado Pago
mercadopago.configure({
  access_token: process.env.APP_USR-3709341188085811-050219-1dde9cca4db5f13738f043119fdb7c30-220520212 // Chave secreta será configurada via variável de ambiente
});

// Middleware
app.use(express.json());
app.use(cors());

// Rota para criar pagamento Pix
app.post('/create-payment', async (req, res) => {
  try {
    const paymentData = req.body;

    const payment = await mercadopago.payment.create({
      transaction_amount: paymentData.transaction_amount,
      description: paymentData.description,
      payment_method_id: paymentData.payment_method_id,
      payer: paymentData.payer,
      notification_url: paymentData.notification_url
    });

    const qrCode = payment.body.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = payment.body.point_of_interaction?.transaction_data?.qr_code_base64;
    const paymentId = payment.body.id;

    if (!qrCode || !qrCodeBase64 || !paymentId) {
      throw new Error('Dados do QR code não retornados pela API. Verifique se a chave PIX está registrada.');
    }

    res.status(200).json({
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      payment_id: paymentId
    });
  } catch (error) {
    console.error('Erro ao criar pagamento Pix:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para verificar o status do pagamento
app.get('/payment-status/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;
    const payment = await mercadopago.payment.get(paymentId);
    const status = payment.body.status;
    res.status(200).json({ status: status });
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para receber notificações (webhook)
app.post('/webhook', (req, res) => {
  const event = req.body;
  console.log('Notificação recebida:', event);

  if (event.action === 'payment.updated') {
    const paymentId = event.data.id;
    console.log(`Pagamento ${paymentId} atualizado. Status: ${event.data.status}`);
    // Aqui você pode atualizar o status do pedido no seu sistema
  }

  res.status(200).send('Notificação recebida');
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
