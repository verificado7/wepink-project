const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '[invalid url, do not cite]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { amount, payerEmail, payerCpf, payerName } = req.body;

    // Validate required parameters
    if (!amount || !payerEmail || !payerCpf || !payerName) {
      console.error('Missing parameters:', { amount, payerEmail, payerCpf, payerName });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const response = await axios.post('[invalid url, do not cite] {
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
        notification_url: '[invalid url, do not cite]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          'X-Idempotency-Key': uuidv4()
        }
      });

      console.log('Mercado Pago response:', response.data);

      // Check if QR Code data is present
      if (!response.data.point_of_interaction || !response.data.point_of_interaction.transaction_data) {
        throw new Error('QR Code not found. Verify Pix key configuration.');
      }

      res.status(200).json({
        qrCode: response.data.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64: response.data.point_of_interaction.transaction_data.qr_code_base64 || '',
        transactionId: response.data.id
      });
    } catch (error) {
      console.error('Error generating Pix:', error.response ? error.response.data : error.message);
      res.status(error.response?.status || 500).json({
        error: 'Failed to process payment with Mercado Pago',
        details: error.response ? error.response.data : error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed. Use POST for /create-pix' });
  }
};
