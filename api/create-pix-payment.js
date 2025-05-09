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

// Rota para salvar pedidos
app.post('/save-order', (req, res) => {
  try {
    const order = req.body;
    if (Array.isArray(order)) {
      orders = order; // Substitui a lista de pedidos (usado pelo admin.html)
    } else {
      orders.push(order); // Adiciona um único pedido (usado pelo payment.html)
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
