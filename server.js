const express = require('express');
const path = require('path');
const apiRoutes = require('./api/server'); // Importa o servidor da API

const app = express();

// Configura o Express para servir arquivos estáticos da raiz do projeto
app.use(express.static(path.join(__dirname, '/')));

// Roteia as requisições da API para o servidor em api/server.js
app.use('/api', apiRoutes);
app.use('/create-payment', apiRoutes);
app.use('/payment-status', apiRoutes);

// Para qualquer outra rota, serve o index.html (para suportar roteamento do lado do cliente)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicia o servidor na porta fornecida pelo Render (ou 3000 localmente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});