const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express(); // Use app diretamente em vez de router

// Middleware para CORS
app.use(cors({ origin: '[invalid url, do not cite]' }));
app.use(express.json()); // Necessário para parsear o corpo das requisições POST

// Rota para buscar informações de CEP
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
