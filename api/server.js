const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');

const router = express.Router();

// Middleware para parsing de JSON e CORS
router.use(express.json());
router.use(cors());

// Configura o Mercado Pago com o token de acesso
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-3709341188085811-050219-1dde9cca4db5f13738f043119fdb7c30-220520212',
});

// Rota para criar um pagamento
router.post('/create-payment', async (req, res) => {
  try {
    const { transaction_amount, description, payment_method_id, payer } = req.body;

    const preference = {
      items: [
        {
          title: description,
          unit_price: transaction_amount,
          quantity: 1,
        },
      ],
      payer: {
        email: payer.email,
      },
      payment_methods: {
        default_payment_method_id: payment_method_id,
      },
      back_urls: {
        success: "https://wepink-project.onrender.com/success", // Ajustado para o domínio do Render
        failure: "https://wepink-project.onrender.com/failure",
        pending: "https://wepink-project.onrender.com/pending",
      },
      auto_return: "approved",
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ id: response.body.id });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

// Rota para verificar o status do pagamento
router.get('/payment-status/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;
    const response = await mercadopago.payment.get(paymentId);
    res.json({ status: response.body.status });
  } catch (error) {
    console.error("Erro ao verificar status do pagamento:", error);
    res.status(500).json({ error: "Erro ao verificar status do pagamento" });
  }
});

module.exports = router;
