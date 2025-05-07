const mercadopago = require('mercadopago');
const { v4: uuidv4 } = require('uuid');

// Configurar as credenciais do Mercado Pago
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

// Função para criar um pagamento Pix
module.exports = async (req, res) => {
  try {
    const { amount, payerEmail, payerCpf, payerName } = req.body;

    // Validar dados recebidos
    if (!amount || !payerEmail || !payerCpf || !payerName) {
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
        first_name: payerName.split(' ')[0],
        last_name: payerName.split(' ').slice(1).join(' ') || 'Sobrenome'
      }
    };

    // Gerar uma chave de idempotência única
    const idempotencyKey = uuidv4();

    // Fazer a requisição para criar o pagamento com a chave de idempotência
    const response = await mercadopago.payment.create(paymentData, {
      headers: {
        'X-Idempotency-Key': idempotencyKey
      }
    });

    // Verificar se os dados do PIX foram retornados
    if (!response.body.point_of_interaction || !response.body.point_of_interaction.transaction_data) {
      return res.status(500).json({ error: 'Resposta do Mercado Pago incompleta. Verifique a configuração da chave PIX.' });
    }

    // Retornar o QR code e informações do Pix
    res.status(200).json({
      qrCode: response.body.point_of_interaction.transaction_data.qr_code,
      qrCodeBase64: response.body.point_of_interaction.transaction_data.qr_code_base64,
      transactionId: response.body.id
    });
  } catch (error) {
    console.error('Erro ao gerar Pix:', error);
    res.status(500).json({ error: `Erro ao gerar Pix: ${error.message}` });
  }
};
