const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://wepink-project.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Lidar com requisições OPTIONS (pré-flight para CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rota para criar pagamento (/create-pix)
  if (req.method === 'POST') {
    const { amount, payerEmail, payerCpf, payerName } = req.body;

    if (!amount || !payerEmail || !payerCpf || !payerName) {
      console.error('Dados incompletos:', { amount, payerEmail, payerCpf, payerName });
      return res.status(400).json({ error: 'Parâmetros ausentes: amount, payerEmail, payerCpf e payerName são obrigatórios' });
    }

    try {
      const response = await axios.post('https://api.mercadopago.com/v1/payments', {
        transaction_amount: parseFloat(amount),
        payment_method_id: 'pix',
        description: 'Pagamento Wepink - Perfumaria',
        payer: {
          email: payerEmail,
          first_name: payerName.split(' ')[0] || 'Nome',
          last_name: payerName.split(' ').slice(1).join(' ') || 'Sobrenome',
          identification: {
            type: 'CPF',
            number: payerCpf
          }
        },
        notification_url: 'https://wepink-backend.onrender.com/webhook'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-3305927250346517-050721-3a333f9b3713a09776360a06d461-22052021'}`,
          'X-Idempotency-Key': uuidv4()
        }
      });

      console.log('Resposta completa do Mercado Pago:', response.data);

      if (!response.data.id) {
        throw new Error('ID do pagamento não encontrado na resposta do Mercado Pago.');
      }
      if (!response.data.point_of_interaction || !response.data.point_of_interaction.transaction_data || !response.data.point_of_interaction.transaction_data.qr_code) {
        throw new Error('QR Code não encontrado. Verifique se a chave Pix está registrada na conta do Mercado Pago.');
      }

      res.status(200).json({
        transactionId: response.data.id,
        qrCode: response.data.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64: response.data.point_of_interaction.transaction_data.qr_code_base64 || ''
      });
    } catch (error) {
      console.error('Erro ao conectar com o Mercado Pago:', error.response ? error.response.data : error.message);
      res.status(500).json({
        error: 'Erro ao processar o pagamento no Mercado Pago.',
        details: error.response ? error.response.data : error.message
      });
    }
  }

  // Método não suportado
  else {
    res.status(405).json({ error: 'Método não permitido. Use POST para /create-pix' });
  }
};
