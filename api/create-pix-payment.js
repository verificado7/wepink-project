const mercadopago = require('mercadopago');

// Configurar as credenciais do Mercado Pago
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

// Função para criar um pagamento Pix
module.exports = async (req, res) => {
  try {
    const { amount, payerEmail, payerCpf, payerName } = req.body;

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

    // Fazer a requisição para criar o pagamento
    const response = await mercadopago.payment.create(paymentData);

    // Retornar o QR code e informações do Pix
    res.status(200).json({
      qrCode: response.body.point_of_interaction.transaction_data.qr_code,
      qrCodeBase64: response.body.point_of_interaction.transaction_data.qr_code_base64,
      transactionId: response.body.id
    });
  } catch (error) {
    console.error('Erro ao gerar Pix:', error);
    res.status(500).json({ error: 'Erro ao gerar Pix: ' + error.message });
  }
};
