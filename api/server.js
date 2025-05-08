const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Middleware para logar todas as requisições recebidas
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Requisição recebida: ${req.method} ${req.url}`);
  console.log('Cabeçalhos:', req.headers);
  console.log('Corpo:', req.body);
  next();
});

// Rota para buscar informações de CEP
app.get('/cep/:cep', async (req, res) => {
  const cep = req.params.cep.replace(/\D/g, '');
  if (cep.length !== 8) {
    return res.status(400).json({ error: 'CEP inválido. Deve conter 8 dígitos.' });
  }

  try {
    const response = await fetch(`[invalid url, do not cite]);
    const data = await response.json();
    if (data.erro) {
      return res.status(404).json({ error: 'CEP não encontrado.' });
    }
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    res.status(500).json({ error: 'Erro ao buscar CEP. Tente novamente mais tarde.' });
  }
});

// Rota para criar pagamento PIX
const createPixPayment = require('./create-pix-payment');
app.post('/create-pix', createPixPayment);

// Iniciar o servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
