const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static('.')); // Serve arquivos estáticos da raiz

// Rota para servir payment.html
app.get('/payment.html', (req, res) => {
  console.log('Passo 7: Servindo payment.html');
  res.sendFile(path.join(__dirname, 'payment.html'));
});

// Rota para servir confirmation.html
app.get('/confirmation.html', (req, res) => {
  console.log('Passo 7: Servindo confirmation.html');
  res.sendFile(path.join(__dirname, 'confirmation.html'));
});

// Rota para servir admin.html
app.get('/admin.html', (req, res) => {
  console.log('Passo 7: Servindo admin.html');
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Armazenar pedidos em memória
let orders = [];

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
    if (!order.pixDetails.qrCode) {
      order.pixDetails.qrCode = 'Erro na geração do Pix';
    }
  }
}

// Endpoint para criar QR code Pix (simplificado para teste)
app.post('/create-pix', async (req, res) => {
  try {
    console.log('Passo 7: Requisição recebida em /create-pix:', req.body);
    const { amount, description, email } = req.body;

    // Validações
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'O valor da transação é obrigatório e deve ser maior que zero.' });
    }
    if (!description) {
      return res.status(400).json({ error: 'A descrição é obrigatória.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'O e-mail é obrigatório e deve ser válido.' });
    }

    // Resposta fictícia para teste
    res.status(200).json({
      qrCode: 'QR Code Fictício para Teste',
      qrCodeBase64: ''
    });
  } catch (error) {
    console.error('Passo 7: Erro na rota /create-pix:', error.message);
    res.status(200).json({
      qrCode: 'Erro na geração do Pix: ' + error.message,
      qrCodeBase64: ''
    });
  }
});

// Rota para receber notificações do Mercado Pago (webhook)
app.post('/webhook', (req, res) => {
  console.log('Passo 7: Notificação recebida no webhook:', req.body);
  res.status(200).send('Notificação recebida');
});

// Rota para salvar pedidos
app.post('/save-order', (req, res) => {
  try {
    console.log('Passo 7: Requisição recebida em /save-order:', req.body);
    const orderData = req.body;
    if (Array.isArray(orderData)) {
      orders = orderData;
      orders.forEach((order, index) => {
        try {
          validateOrder(order);
          if (!order.orderNumber) {
            order.orderNumber = `PED-${Date.now()}-${index + 1}`;
          }
        } catch (error) {
          console.error(`Passo 7: Erro ao validar pedido #${index + 1} na lista:`, error.message);
          throw new Error(`Erro ao validar pedido #${index + 1}: ${error.message}`);
        }
      });
    } else {
      validateOrder(orderData);
      if (!orderData.orderNumber) {
        orderData.orderNumber = `PED-${Date.now()}-${orders.length + 1}`;
      }
      orders.push(orderData);
    }

    console.log('Passo 7: Pedido(s) salvo(s) no backend (em memória):', orders);
    res.status(200).json({ message: 'Pedido(s) salvo(s) com sucesso', orders });
  } catch (error) {
    console.error('Passo 7: Erro na rota /save-order:', error.message);
    res.status(500).json({ error: 'Erro ao salvar pedido: ' + error.message });
  }
});

// Rota para recuperar pedidos
app.get('/get-orders', (req, res) => {
  console.log('Passo 7: Requisição recebida em /get-orders');
  console.log('Passo 7: Pedidos recuperados do backend:', orders);
  if (!Array.isArray(orders)) {
    console.error('Passo 7: Lista de pedidos não é um array. Retornando array vazio.');
    return res.status(200).json([]);
  }
  res.status(200).json(orders);
});

// Rota padrão para a raiz
app.get('/', (req, res) => {
  console.log('Passo 7: Servindo payment.html na rota raiz');
  res.sendFile(path.join(__dirname, 'payment.html'));
});

// Rota de teste para verificar se o servidor está funcionando
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Servidor está funcionando!' });
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
