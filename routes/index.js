// routes/index.js
const express = require('express');
const router = express.Router();
const pluttoController = require('../controllers/pluttoController');

// GET / - Render the form
router.get('/', (req, res) => {
  res.render('form');
});

// POST /submit - Create entity validation
router.post('/submit', pluttoController.submitValidation);

// POST /plutto-webhook - Handle Plutto webhook
router.post('/plutto-webhook', pluttoController.handleWebhook);

module.exports = router;