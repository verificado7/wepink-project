const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
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
        'Authorization': `Bearer TEST-a65b9660-44d5-4174-9a61-85dcc49ed6c`, // Mesmo token do front-end
        'X-Idempotency-Key': uuidv4()
      }
    });

    console.log('Resposta completa do Mercado Pago:', response.data);

    if (!response.data.id) {
      throw new Error('ID do pagamento não encontrado na resposta do Mercado Pago');
    }
    if (!response.data.point_of_interaction || !response.data.point_of_interaction.transaction_data || !response.data.point_of_interaction.transaction_data.qr_code) {
      throw new Error('QR Code não encontrado na resposta do Mercado Pago. Verifique se a chave Pix está registrada na conta de teste.');
    }

    res.status(200).json({
      payment_id: response.data.id,
      qr_code: response.data.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: response.data.point_of_interaction.transaction_data.qr_code_base64 || ''
    });
  } catch (error) {
    console.error('Erro ao conectar com o Mercado Pago:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Erro ao conectar com o Mercado Pago', details: error.response ? error.response.data : error.message });
  }
};