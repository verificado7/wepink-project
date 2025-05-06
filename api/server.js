const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Lidar com requisições OPTIONS (pré-flight para CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rota para criar pagamento (/create-payment)
  if (req.method === 'POST') {
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
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-3709341188085811-050219-1dde9cca4db5f13738f043119fdb7c30-220520212'}`,
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
  }

  // Rota para verificar status do pagamento (/payment-status/:id)
  else if (req.method === 'GET') {
    const paymentId = req.url.split('/').pop(); // Extrai o paymentId da URL (ex.: /payment-status/123 -> 123)

    if (!paymentId) {
      return res.status(400).json({ error: 'ID do pagamento não fornecido' });
    }

    try {
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-3709341188085811-050219-1dde9cca4db5f13738f043119fdb7c30-220520212'}`
        }
      });

      console.log('Status do pagamento:', response.data);

      res.status(200).json({
        status: response.data.status // Retorna o status do pagamento (ex.: "approved", "rejected", "pending")
      });
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error.response ? error.response.data : error.message);
      res.status(500).json({
        error: 'Erro ao verificar status do pagamento',
        details: error.response ? error.response.data : error.message
      });
    }
  }

  // Método não suportado
  else {
    res.status(405).json({ error: 'Método não permitido. Use POST para /create-payment ou GET para /payment-status/:id' });
  }
};
