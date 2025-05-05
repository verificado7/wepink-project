const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Endpoint GET para verificar se o servidor está ativo
app.get('/create-payment', (req, res) => {
  res.status(200).json({ status: 'Servidor ativo', message: 'Use POST para criar um pagamento' });
});

app.post('/create-payment', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const { transaction_amount, description, payment_method_id, payer } = req.body;

  if (!transaction_amount || !payment_method_id || !payer || !payer.email || !payer.identification || !payer.identification.number) {
    return res.status(400).json({ error: 'Parâmetros ausentes: transaction_amount, payment_method_id, payer.email e payer.identification.number são obrigatórios' });
  }

  try {
    const response = await axios.post('https://api.mercadopago.com/v1/payments', {
      transaction_amount: parseFloat(transaction_amount),
      payment_method_id,
      description,
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: {
          type: payer.identification.type,
          number: payer.identification.number
        }
      },
      notification_url: 'https://your-notification-url.com/webhook'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer APP_USR-3709341188085811-050219-1dde9cca4db5f13738f043119fdb7c30-220520212`,
        'X-Idempotency-Key': uuidv4()
      }
    });

    console.log('Resposta completa do Mercado Pago:', response.data);

    if (!response.data.id) {
      throw new Error('ID do pagamento não encontrado na resposta do Mercado Pago.');
    }
    if (!response.data.point_of_interaction || !response.data.point_of_interaction.transaction_data || !response.data.point_of_interaction.transaction_data.qr_code) {
      throw new Error('QR Code não encontrado. Verifique se a chave Pix está registrada na conta de teste do Mercado Pago.');
    }

    res.status(200).json({
      payment_id: response.data.id,
      qr_code: response.data.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: response.data.point_of_interaction.transaction_data.qr_code_base64 || ''
    });
  } catch (error) {
    console.error('Erro ao conectar com o Mercado Pago:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
      error: 'Erro ao processar o pagamento no Mercado Pago.', 
      details: error.response ? error.response.data : error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando localmente na porta ${PORT}`);
});