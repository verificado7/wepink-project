const express = require('express');
const MercadoPago = require('mercadopago');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(express.static('public'));
app.use(cors());

// Configuração do Mercado Pago com o token de acesso
MercadoPago.configure({
  access_token: process.env.MP_ACCESS_TOKEN || 'APP_USR-3709341188085811-050219-1dde9cca4db5f1373f043919fdb7c30-220520212'
});

// Rota para criar um pagamento Pix e retornar o QR Code
app.post('/create-pix', async (req, res) => {
  console.log('Passo 1: Requisição recebida em /create-pix:', req.body);
  const { amount, description, email } = req.body;

  try {
    if (!amount || !description || !email) {
      throw new Error('Dados incompletos: amount, description e email são obrigatórios.');
    }

    const paymentData = {
      transaction_amount: amount,
      description: description,
      payment_method_id: 'pix',
      payer: { email: email }
    };

    const payment = await MercadoPago.payment.create(paymentData);
    console.log('Passo 1: Pagamento criado com sucesso:', payment.body);

    res.status(200).json({
      qr_code: payment.body.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: payment.body.point_of_interaction.transaction_data.qr_code_base64
    });
  } catch (error) {
    console.error('Passo 1: Erro ao criar Pix:', error.message);
    res.status(500).json({ error: 'Falha ao gerar QR Code Pix: ' + error.message });
  }
});

// Rota para salvar pedidos
app.post('/save-order', async (req, res) => {
  const ordersPath = path.join(__dirname, 'data', 'orders.json');
  console.log('Passo 2: Requisição recebida em /save-order:', req.body);

  try {
    let orders = [];
    try {
      const data = await fs.readFile(ordersPath, 'utf8');
      orders = JSON.parse(data);
    } catch (err) {
      console.log('Passo 2: Arquivo orders.json não existe, criando novo:', err.message);
    }

    orders.push(req.body);
    await fs.writeFile(ordersPath, JSON.stringify(orders, null, 2));
    console.log('Passo 2: Pedido salvo com sucesso:', req.body);

    res.status(200).json({ message: 'Pedido salvo com sucesso' });
  } catch (error) {
    console.error('Passo 2: Erro ao salvar pedido:', error.message);
    res.status(500).json({ error: 'Erro ao salvar pedido: ' + error.message });
  }
});

// Rota para recuperar pedidos
app.get('/get-orders', async (req, res) => {
  const ordersPath = path.join(__dirname, 'data', 'orders.json');
  console.log('Passo 3: Requisição recebida em /get-orders');

  try {
    const data = await fs.readFile(ordersPath, 'utf8');
    const orders = JSON.parse(data);
    console.log('Passo 3: Pedidos retornados:', orders);
    res.status(200).json(orders);
  } catch (error) {
    console.error('Passo 3: Erro ao carregar pedidos:', error.message);
    res.status(500).json({ error: 'Erro ao carregar pedidos: ' + error.message });
  }
});

// Iniciar o servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
