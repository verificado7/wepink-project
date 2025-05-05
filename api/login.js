const users = [
  { email: 'exemplo@mail.com', password: 'senha123' },
  { email: 'teste@wepink.com', password: 'teste123' }
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { email, password } = req.body;

  // Validações básicas
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  // Procurar usuário na lista
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }

  // Autenticação bem-sucedida
  res.status(200).json({ message: 'Autenticação bem-sucedida.' });
};