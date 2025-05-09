const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

// Caminho para o arquivo de pedidos
const ordersFilePath = path.join(__dirname, 'orders.json');

// Carregar pedidos do arquivo ao iniciar
let orders = [];
if (fs.existsSync(ordersFilePath)) {
  try {
    const data = fs.readFileSync(ordersFilePath, 'utf8');
    orders = JSON.parse(data);
    console.log('Pedidos carregados do arquivo:', orders);
  } catch (error) {
    console.error('Erro ao carregar pedidos do arquivo:', error);
    orders = [];
  }
}

// Função para salvar pedidos no arquivo
function saveOrders() {
  try {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
    console.log('Pedidos salvos no arquivo:', orders);
  } catch (error) {
    console.error('Erro ao salvar pedidos no arquivo:', error);
    throw new Error('Erro ao salvar pedidos no arquivo: ' + error.message);
  }
}

// Função para validar o pedido antes de salvar
function validateOrder(order) {
  if (!order || typeof order !== 'object') {
    throw new Error('Pedido inválido: objeto de pedido não fornecido ou mal formado.');
  }

  // Campos obrigatórios
  if (!order.purchaseData || !order.purchaseData.cartItems || !Array.isArray(order.purchaseData.cartItems)) {
    throw new Error('Pedido inválido: cartItems não fornecido ou não é um array.');
  }
  if (!order.customerDetails || typeof order.customerDetails !== 'object') {
    throw new Error('Pedido inválido: customerDetails não fornecido ou mal formado.');
  }
  if (!order.customerDetails.name || typeof order.customerDetails.name !== 'string') {
    throw new Error('Pedido inválido: Nome do cliente não fornecido ou inválido.');
  }
  if (!order.customerDetails.email || !/\S+@\S+\.\S+/.test(order.customerDetails.email)) {
    throw new Error('Pedido inválido: E-mail do cliente não fornecido ou inválido.');
  }
  if (!order.customerDetails.cpf || !/^\d{11}$/.test(order.customerDetails.cpf.replace(/\D/g, ''))) {
    throw new Error('Pedido inválido: CPF do cliente não fornecido ou inválido.');
  }
  if (!order.paymentMethod || !['Pix', 'Cartão'].includes(order.paymentMethod)) {
    throw new Error('Pedido inválido: paymentMethod não fornecido ou inválido.');
  }
  if (!order.orderDate || isNaN(new Date(order.orderDate).getTime())) {
    throw new Error('Pedido inválido: orderDate não fornecido ou inválido.');
  }
  if (!order.items || !Array.isArray(order.items)) {
    throw new Error('Pedido inválido: items não fornecido ou não é um array.');
  }
  if (!order.status || !['Gerado', 'Efetuado', 'Pendente'].includes(order.status)) {
    throw new Error('Pedido inválido: status não fornecido ou inválido.');
  }
  if (order.paymentMethod === 'Pix' && (!order.pixDetails || typeof order.pixDetails !== 'object')) {
    throw new Error('Pedido inválido: pixDetails não fornecido ou mal formado para pagamento Pix.');
  }
}

// Função para criar QR Code Pix
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
    const errorMessage = error.response?.data?.message || error.message;
    throw new Error(`Falha ao gerar QR code Pix: ${errorMessage}`);
  }
}

// Rota para gerar o QR Code Pix
app.post('/create-pix', async (req, res) => {
  try {
    const { amount, description, email } = req.body;
    if (!amount || !description || !email) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos: amount, description, email.' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'O valor (amount) deve ser um número positivo.' });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    const pix = await createPix(amount, description, email);
    res.status(200).json(pix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para salvar pedidos
app.post('/save-order', (req, res) => {
  try {
    const orderData = req.body;
    if (Array.isArray(orderData)) {
      // Caso o admin.html envie uma lista de pedidos (atualização em massa)
      orders = orderData;
      orders.forEach((order, index) => {
        try {
          validateOrder(order);
        } catch (error) {
          console.error(`Erro ao validar pedido #${index + 1} na lista:`, error.message);
          throw new Error(`Erro ao validar pedido #${index + 1}: ${error.message}`);
        }
      });
    } else {
      // Caso o payment.html envie um único pedido
      validateOrder(orderData);
      orders.push(orderData);
    }

    saveOrders();
    console.log('Pedido(s) salvo(s) no backend:', orders);
    res.status(200).json({ message: 'Pedido(s) salvo(s) com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar pedido:', error);
    res.status(500).json({ error: 'Erro ao salvar pedido: ' + error.message });
  }
});

// Rota para recuperar pedidos
app.get('/get-orders', (req, res) => {
  console.log('Pedidos recuperados do backend:', orders);
  res.status(200).json(orders);
});

// Configuração do CORS para permitir chamadas de diferentes origens
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Servir arquivos estáticos (como o frontend)
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
