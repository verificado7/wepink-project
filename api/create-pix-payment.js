const axios = require('axios');
const express = require('express');
const app = express();
app.use(express.json());

// Array para armazenar pedidos (substitua por um banco de dados em produção)
let orders = [];

async function createPix(amount, description, payerEmail) {
  try {
    const response = await axios.post('https://api.mercadopago.com/v1/payments', {
      transaction_amount: amount,
      description: description,
      payment_method_id: 'pix',
      payer: {
        email: payerEmail
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const qrCode = response.data.point_of_interaction.transaction_data.qr_code;
    const qrCodeBase64 = response.data.point_of_interaction.transaction_data.qr_code_base64;
    return { qrCode, qrCodeBase64 };
  } catch (error) {
    console.error('Erro ao criar Pix:', error.response?.data || error.message);
    throw new Error('Falha ao gerar QR code Pix: ' + (error.response?.data?.message || error.message));
  }
}

// Rota para gerar o QR Code Pix
app.post('/create-pix', async (req, res) => {
  try {
    const { amount, description, email } = req.body;
    const pix = await createPix(amount, description, email);
    res.json(pix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Nova rota para salvar pedidos
app.post('/save-order', (req, res) => {
  try {
    const order = req.body;
    orders.push(order);
    console.log('Pedido salvo no backend:', order);
    res.status(200).json({ message: 'Pedido salvo com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar pedido:', error);
    res.status(500).json({ error: 'Erro ao salvar pedido' });
  }
});

// Nova rota para recuperar pedidos
app.get('/get-orders', (req, res) => {
  console.log('Pedidos recuperados do backend:', orders);
  res.status(200).json(orders);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
