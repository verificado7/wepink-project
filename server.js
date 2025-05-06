const express = require('express');
const path = require('path');
const apiRoutes = require('./api/server'); // Importa o roteador da API
const fetch = require('node-fetch'); // Para fazer requisições HTTP

const app = express();

// Configura o Express para servir arquivos estáticos da raiz do projeto
app.use(express.static(path.join(__dirname, '/')));

// Roteia as requisições da API para o roteador em api/server.js
app.use('/', apiRoutes);

// Proxy para a API ViaCEP
app.get('/api/viacep/:cep', async (req, res) => {
  const cep = req.params.cep;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) {
      throw new Error('Erro na resposta da API ViaCEP: ' + response.statusText);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar endereço via ViaCEP:', error);
    res.status(500).json({ erro: true, mensagem: 'Erro ao buscar endereço: ' + error.message });
  }
});

// Para qualquer outra rota, serve o index.html (para suportar roteamento do lado do cliente)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicia o servidor na porta fornecida pelo Render (ou 3000 localmente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
