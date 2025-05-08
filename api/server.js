const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

app.use(express.json());

// Middleware para logar requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Requisição: ${req.method} ${req.url}`);
  console.log('Cabeçalhos:', req.headers);
  console.log('Corpo:', req.body);
  next();
});

// Rota para consulta de CEP
app.get('/cep/:cep', async (req, res) => {
  const cep = req.params.cep.replace(/\D/g, '');
  if (cep.length !== 8) {
    return res.status(400).json({ error: 'CEP inválido. Deve conter 8 dígitos.' });
  }
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    if (data.erro) {
      return res.status(404).json({ error: 'CEP não encontrado.' });
    }
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    res.status(500).json({ error: 'Erro ao buscar CEP.' });
  }
});

// Rota para criar pagamento Pix
const createPixPayment = require('./create-pix-payment');
app.post('/create-pix', createPixPayment);

// Iniciar o servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
