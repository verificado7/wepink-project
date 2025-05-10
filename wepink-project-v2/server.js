const express = require('express');
    const fs = require('fs').promises;
    const path = require('path');
    const cors = require('cors');
    const createPixPayment = require('./create-pix-payment');

    const app = express();

    app.use(express.json());
    app.use(cors());
    app.use(express.static(path.join(__dirname, 'public')));

    // Rota específica para payment.html
    app.get('/payment.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'payment.html'));
    });

    // Rota para criar pagamento Pix
    app.post('/create-payment', createPixPayment);

    // Rota para salvar pedidos
    app.post('/save-order', async (req, res) => {
      const ordersPath = path.join(__dirname, 'data', 'orders.json');
      console.log('Passo 1: Requisição recebida em /save-order:', req.body);

      try {
        let orders = [];
        try {
          const data = await fs.readFile(ordersPath, 'utf8');
          orders = JSON.parse(data);
        } catch (err) {
          console.log('Passo 1: Arquivo orders.json não existe, criando novo:', err.message);
        }

        orders.push(req.body);
        await fs.writeFile(ordersPath, JSON.stringify(orders, null, 2));
        console.log('Passo 1: Pedido salvo com sucesso:', req.body);

        res.status(200).json({ message: 'Pedido salvo com sucesso' });
      } catch (error) {
        console.error('Passo 1: Erro ao salvar pedido:', error.message);
        res.status(500).json({ error: 'Erro ao salvar pedido: ' + error.message });
      }
    });

    // Rota para recuperar pedidos
    app.get('/get-orders', async (req, res) => {
      const ordersPath = path.join(__dirname, 'data', 'orders.json');
      console.log('Passo 2: Requisição recebida em /get-orders');

      try {
        const data = await fs.readFile(ordersPath, 'utf8');
        const orders = JSON.parse(data);
        console.log('Passo 2: Pedidos retornados:', orders);
        res.status(200).json(orders);
      } catch (error) {
        console.error('Passo 2: Erro ao carregar pedidos:', error.message);
        res.status(500).json({ error: 'Erro ao carregar pedidos: ' + error.message });
      }
    });

    // Rota para verificar o status do pagamento (simulada para testes)
    app.get('/payment-status/:id', async (req, res) => {
      const paymentId = req.params.id;
      console.log(`Verificando status do pagamento para ID: ${paymentId}`);

      // Simulação: retorna um status fixo para testes
      try {
        const simulatedStatus = Math.random() > 0.5 ? 'approved' : 'pending';
        res.status(200).json({ status: simulatedStatus });
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error.message);
        res.status(500).json({ error: 'Erro ao verificar status do pagamento: ' + error.message });
      }
    });

    // Iniciar o servidor
    const PORT = process.env.PORT || 80;
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });