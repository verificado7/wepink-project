const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Importa a API de CEP
const apiServer = require('./api/server');

// Usa a API de CEP
app.use(apiServer);

// Serve arquivos estáticos da raiz do projeto
app.use(express.static(path.join(__dirname, '.')));

// Rota padrão para servir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
