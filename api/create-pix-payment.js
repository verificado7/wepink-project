const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Middleware para parsing de JSON
app.use(express.json());

// Configuração do CORS para permitir chamadas de diferentes origens
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Servir arquivos estáticos da raiz do projeto
app.use(express.static('.'));

// Rota para servir payment.html
app.get('/payment.html', (req, res) => {
  console.log('Passo 6: Servindo payment.html');
  res.sendFile(path.join(__dirname, 'payment.html'));
});

// Rota para servir confirmation.html
app.get('/confirmation.html', (req, res) => {
  console.log('Passo 6: Servindo confirmation.html');
  res.sendFile(path.join(__dirname, 'confirmation.html'));
});

// Rota para servir admin.html
app.get('/admin.html', (req, res) => {
  console.log('Passo 6: Servindo admin.html');
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Rota padrão para a raiz
app.get('/', (req, res) => {
  console.log('Passo 6: Servindo payment.html na rota raiz');
  res.sendFile(path.join(__dirname, 'payment.html'));
});

// Rota de teste para verificar se o servidor está funcionando
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Servidor está funcionando!' });
});

// Caminho para o arquivo de pedidos
const ordersFilePath = path.join(__dirname, 'orders.json');

// Carregar pedidos do arquivo ao iniciar
let orders = [];
if (fs.existsSync(ordersFilePath)) {
  try {
    const data = fs.readFileSync(ordersFilePath, 'utf8');
    orders = JSON.parse(data);
    console.log('Passo 6: Pedidos carregados do arquivo:', orders);
  } catch (error) {
    console.error('Passo 6: Erro ao carregar pedidos do arquivo:', error.message);
    orders = [];
  }
} else {
  console.log('Passo 6: Arquivo orders.json não encontrado. Criando novo arquivo.');
  fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
}

// Função para salvar pedidos no arquivo
function saveOrders() {
  try {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
    console.log('Passo 6: Pedidos salvos no arquivo:', orders);
  } catch (error) {
    console.error('Passo 6: Erro ao salvar pedidos no arquivo:', error.message);
    throw new Error('Erro ao salvar pedidos no arquivo: ' + error.message);
  }
}

// Função para validar o pedido antes de salvar
function validateOrder(order) {
  if (!order || typeof order !== 'object') {
    throw new Error('Pedido inválido: objeto de pedido não fornecido ou mal formado.');
  }

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
  if (order.paymentMethod === 'Pix') {
    if (!order.pixDetails || typeof order.pixDetails !== 'object') {
      throw new Error('Pedido inválido: pixDetails não fornecido ou mal formado para pagamento Pix.');
    }
    // Permitir que qrCode seja opcional ou marcado como erro
    if (!order.pixDetails.qrCode) {
      order.pixDetails.qrCode = 'Erro na geração do Pix';
    }
  }
}

// Função para criar QR Code Pix
async function createPix(amount, description, payerEmail) {
  try {
    // Verificar se o token do Mercado Pago está definido
    if (!process.env.MP_ACCESS_TOKEN) {
      throw new Error('Token de acesso do Mercado Pago (MP_ACCESS_TOKEN) não está definido. Configure a variável de ambiente.');
    }

    // Gerar um valor único para o X-Idempotency-Key
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('Passo 6: Criando Pix com os dados:', { amount, description, payerEmail, idempotencyKey });

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
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      }
    });

    console.log('Passo 6: Resposta do Mercado Pago:', response.data);

    const qrCode = response.data.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = response.data.point_of_interaction?.transaction_data?.qr_code_base64;

    if (!qrCode || !qrCodeBase64) {
      throw new Error('QR Code ou QR Code Base64 não retornados pelo Mercado Pago. Resposta: ' + JSON.stringify(response.data));
    }

    return { qrCode, qrCodeBase64 };
  } catch (error) {
    console.error('Passo 6: Erro ao criar Pix:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || error.message;
    throw new Error(`Falha ao gerar QR code Pix: ${errorMessage}`);
  }
}

// Rota para gerar o QR Code Pix
app.post('/create-pix', async (req, res) => {
  try {
    console.log('Passo 6: Requisição recebida em /create-pix:', req.body);
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
    console.error('Passo 6: Erro na rota /create-pix:', error.message);
    // Retornar um QR code fictício para permitir o salvamento do pedido
    res.status(200).json({
      qrCode: 'Erro na geração do Pix',
      qrCodeBase64: ''
    });
  }
});

// Rota para salvar pedidos
app.post('/save-order', (req, res) => {
  try {
    console.log('Passo 6: Requisição recebida em /save-order:', req.body);
    const orderData = req.body;
    if (Array.isArray(orderData)) {
      // Caso o admin.html envie uma lista de pedidos (atualização em massa)
      orders = orderData;
      orders.forEach((order, index) => {
        try {
          validateOrder(order);
        } catch (error) {
          console.error(`Passo 6: Erro ao validar pedido #${index + 1} na lista:`, error.message);
          throw new Error(`Erro ao validar pedido #${index + 1}: ${error.message}`);
        }
      });
    } else {
      // Caso o payment.html envie um único pedido
      validateOrder(orderData);
      orders.push(orderData);
    }

    saveOrders();
    console.log('Passo 6: Pedido(s) salvo(s) no backend:', orders);
    res.status(200).json({ message: 'Pedido(s) salvo(s) com sucesso', orders });
  } catch (error) {
    console.error('Passo 6: Erro na rota /save-order:', error.message);
    res.status(500).json({ error: 'Erro ao salvar pedido: ' + error.message });
  }
});

// Rota para recuperar pedidos
app.get('/get-orders', (req, res) => {
  console.log('Passo 6: Requisição recebida em /get-orders');
  console.log('Passo 6: Pedidos recuperados do backend:', orders);
  if (!Array.isArray(orders)) {
    console.error('Passo 6: Lista de pedidos não é um array. Retornando array vazio.');
    res.status(200).json([]);
  } else {
    res.status(200).json(orders);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
