const mercadopago = require('mercadopago');
const { v4: uuidv4 } = require('uuid');

// Configurar as credenciais do Mercado Pago
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN || ''
});

// Função para criar um pagamento Pix
module.exports = async (req, res) => {
  try {
    console.log('Recebendo requisição para gerar PIX:', req.body);
    const { amount, payerEmail, payerCpf, payerName } = req.body;

    // Validar dados recebidos
    if (!amount || !payerEmail || !payerCpf || !payerName) {
      console.error('Dados incompletos:', { amount, payerEmail, payerCpf, payerName });
      return res.status(400).json({ error: 'Dados incompletos. Forneça amount, payerEmail, payerCpf e payerName.' });
    }

    // Criar o objeto de pagamento
    const paymentData = {
      transaction_amount: parseFloat(amount),
      description: 'Pagamento Wepink - Perfumaria',
      payment_method_id: 'pix',
      payer: {
        email: payerEmail,
        identification: {
          type: 'CPF',
          number: payerCpf
        },
        first_name: payerName.split(' ')[0] || 'Nome',
        last_name: payerName.split(' ').slice(1).join(' ') || 'Sobrenome'
      }
    };

    // Verificar se o Access Token está configurado
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('Access Token do Mercado Pago não configurado.');
      return res.status(500).json({ error: 'Access Token do Mercado Pago não configurado.' });
    }

    // Gerar uma chave de idempotência única
    const idempotencyKey = uuidv4();
    console.log('Chave de idempotência gerada:', idempotencyKey);

    // Fazer a requisição para criar o pagamento
    console.log('Enviando requisição ao Mercado Pago:', paymentData);
    const response = await mercadopago.payment.create(paymentData, {
      idempotencyKey: idempotencyKey
    });

    console.log('Resposta do Mercado Pago:', response.body);

    // Verificar se os dados do PIX foram retornados
    if (!response.body.point_of_interaction || !response.body.point_of_interaction.transaction_data) {
      console.error('Resposta do Mercado Pago incompleta:', response.body);
      return res.status(500).json({ error: 'Resposta do Mercado Pago incompleta. Verifique a configuração da chave PIX.' });
    }

    // Retornar o QR code e informações do Pix
    const pixData = {
      qrCode: response.body.point_of_interaction.transaction_data.qr_code,
      qrCodeBase64: response.body.point_of_interaction.transaction_data.qr_code_base64,
      transactionId: response.body.id
    };
    console.log('PIX gerado com sucesso:', pixData);
    res.status(200).json(pixData);
  } catch (error) {
    console.error('Erro ao gerar Pix:', error.message, error.stack);
    res.status(500).json({ error: `Erro ao gerar Pix: ${error.message}` });
  }
};
