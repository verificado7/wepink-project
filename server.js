const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

// Caminho para o arquivo de pedidos
const ordersFilePath = path.join(__dirname, 'orders.json');

// Carregar pedidos do arquivo ao iniciar
let orders = [];
if (fs.existsSync(ordersFilePath)) {
  try {
    const data = fs.readFileSync(ordersFilePath, 'utf8');
    orders = JSON.parse(data);
    console.log('Passo 7: Pedidos carregados do arquivo:', orders);
  } catch (error) {
    console.error('Passo 7: Erro ao carregar pedidos do arquivo:', error.message);
    orders = [];
  }
} else {
  console.log('Passo 7: Arquivo orders.json não encontrado. Criando novo arquivo.');
  fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
}

// Função para salvar pedidos no arquivo
function saveOrders() {
  try {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
    console.log('Passo 7: Pedidos salvos no arquivo:', orders);
  } catch (error) {
    console.error('Passo 7: Erro ao salvar pedidos no arquivo:', error.message);
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

    // Converter o valor para centavos (Mercado Pago espera o valor em centavos)
    const transactionAmount = Math.round(amount * 100);
    console.log('Passo 7: Valor convertido para centavos:', transactionAmount);

    // Extrair primeiro e último nome do e-mail (se possível, para preencher os campos exigidos)
    const [firstName, lastName] = payerEmail.split('@')[0].split('.');
    const payer = {
      email: payerEmail,
      first_name: firstName || 'Cliente',
      last_name: lastName || 'Wepink',
      identification: {
        type: 'CPF',
        number: '12345678901' // CPF fictício, pode ser ajustado dinamicamente se disponível no pedido
      }
    };

    // Gerar um valor único para o X-Idempotency-Key
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    console.log('Passo 7: Criando Pix com os dados:', { transaction_amount: transactionAmount, description, payer, idempotencyKey });

    const response = await axios.post('https://api.mercadopago.com/v1/payments', {
      transaction_amount: transactionAmount,
      description: description,
      payment_method_id: 'pix',
      payer: payer,
      notification_url: 'https://wepink-backend.onrender.com/webhook' // URL para receber notificações (opcional)
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      }
    });

    console.log('Passo 7: Resposta completa do Mercado Pago:', JSON.stringify(response.data, null, 2));

    const qrCode = response.data.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = response.data.point_of_interaction?.transaction_data?.qr_code_base64;

    if (!qrCode || !qrCodeBase64) {
      throw new Error('QR Code ou QR Code Base64 não retornados pelo Mercado Pago. Resposta: ' + JSON.stringify(response.data));
    }

    console.log('Passo 7: QR Code gerado com sucesso:', { qrCode, qrCodeBase64 });
    return { qrCode, qrCodeBase64 };
  } catch (error) {
    console.error('Passo 7: Erro ao criar Pix:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || error.message;
    console.error('Passo 7: Detalhes do erro do Mercado Pago:', error.response?.data || error);
    throw new Error(`Falha ao gerar QR code Pix: ${errorMessage}`);
  }
}

// Endpoint para criar QR code Pix
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

    const pix = await createPix(amount, description, email);
    res.status(200).json(pix);
  } catch (error) {
    console.error('Passo 7: Erro na rota /create-pix:', error.message);
    // Retornar um QR code fictício para permitir o salvamento do pedido
    res.status(200).json({
      qrCode: 'Erro na geração do Pix: ' + error.message,
      qrCodeBase64: ''
    });
  }
});

// Rota para receber notificações do Mercado Pago (webhook)
app.post('/webhook', (req, res) => {
  console.log('Passo 7: Notificação recebida no webhook:', req.body);
  // Aqui você pode processar a notificação do Mercado Pago (ex.: atualizar o status do pedido)
  res.status(200).send('Notificação recebida');
});

// Rota para salvar pedidos
app.post('/save-order', (req, res) => {
  try {
    console.log('Passo 7: Requisição recebida em /save-order:', req.body);
    const orderData = req.body;

    if (Array.isArray(orderData)) {
      // Caso o admin.html envie uma lista de pedidos (atualização em massa)
      orders = orderData;
      orders.forEach((order, index) => {
        try {
          validateOrder(order);
          // Adicionar orderNumber se não existir
          if (!order.orderNumber) {
            order.orderNumber = `PED-${Date.now()}-${index + 1}`;
          }
        } catch (error) {
          console.error(`Passo 7: Erro ao validar pedido #${index + 1} na lista:`, error.message);
          throw new Error(`Erro ao validar pedido #${index + 1}: ${error.message}`);
        }
      });
    } else {
      // Caso o payment.html envie um único pedido
      validateOrder(orderData);
      // Adicionar orderNumber se não existir
      if (!orderData.orderNumber) {
        orderData.orderNumber = `PED-${Date.now()}-${orders.length + 1}`;
      }
      orders.push(orderData);
    }

    saveOrders();
    console.log('Passo 7: Pedido(s) salvo(s) no backend:', orders);
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
