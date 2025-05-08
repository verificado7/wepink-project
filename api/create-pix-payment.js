const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    console.log('Recebida requisição POST para /create-pix');

    const { amount, payerEmail, payerCpf, payerName } = req.body;

    // Validar parâmetros obrigatórios
    if (!amount || !payerEmail || !payerCpf || !payerName) {
      console.error('Parâmetros ausentes:', { amount, payerEmail, payerCpf, payerName });
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes' });
    }

    // Verificar se o Access Token está configurado
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('Access Token do Mercado Pago não configurado.');
      return res.status(500).json({ error: 'Access Token do Mercado Pago não configurado.' });
    }

    try {
      console.log('Enviando requisição para o Mercado Pago...');
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
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          'X-Idempotency-Key': uuidv4()
        }
      });

      console.log('Resposta do Mercado Pago:', JSON.stringify(response.data, null, 2));

      // Verificar se os dados do QR Code estão presentes
      if (!response.data.point_of_interaction || !response.data.point_of_interaction.transaction_data) {
        throw new Error('QR Code não encontrado. Verifique a configuração da chave Pix.');
      }

      console.log('QR Code gerado com sucesso:', {
        qrCode: response.data.point_of_interaction.transaction_data.qr_code,
        transactionId: response.data.id
      });

      res.status(200).json({
        qrCode: response.data.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64: response.data.point_of_interaction.transaction_data.qr_code_base64 || '',
        transactionId: response.data.id
      });
    } catch (error) {
      console.error('Erro ao gerar Pix:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
      res.status(error.response?.status || 500).json({
        error: 'Falha ao processar pagamento com Mercado Pago',
        details: error.response ? error.response.data : error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido. Use POST para /create-pix' });
  }
};
