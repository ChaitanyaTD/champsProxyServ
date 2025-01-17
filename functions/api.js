const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const serverless = require('serverless-http');
const crypto = require('crypto');
dotenv.config();

const router = express.Router();
const app = express();

app.use(express.json());
app.use(bodyParser.json());

const favourseApiBaseUrl = 'https://dev.favourse.app/api/payment';

const generateSignature = (data) => {
  const secretKey = process.env.KEY; 
  return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
};

router.post('/invoice/checkout', async (req, res) => {
  try {
    const { qty, successUrl, failedUrl, ticketId } = req.body;

    const payload = {
      qty,
      success_url: successUrl,
      failed_url: failedUrl,
      ticket_id: ticketId,
    };

    const signature = generateSignature(JSON.stringify(payload));

    const response = await axios.post(
      `${favourseApiBaseUrl}/invoice/checkout`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Signature-X': signature,
        },
      }
    );

    const responseBody = {
      success : response.data.success,
      invoice_url: response.data.invoice_url,
      invoice_id: response.data.invoice_id,
    };

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(responseBody);

  } catch (error) {
    console.error('Error creating checkout session:', error.response ? error.response.data : error.message);
    res.status(500).json({
      error: {
        code: error.response ? error.response.data.error.code : 'unknown_error',
        message: error.response ? error.response.data.error.message : error.message,
      },
    });
  }
});

router.post('/payment/status', async (req, res) => {
  try {
    const { invoiceId } = req.body;  
    const { signatureX } = req.headers;

    const response = await axios.post(
      `${favourseApiBaseUrl}/status`,
      { invoiceId },
      {
        headers: {
          'Content-Type': 'application/json',
          'Signature-X': signatureX,
        },
      }
    );

    const responseBody = {
      transactionStatus: response.data.transactionStatus,  
      transactionDetails: response.data.details,
    };

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(responseBody);

  } catch (error) {
    console.error('Error retrieving transaction status:', error.response ? error.response.data : error.message);
    res.status(500).json({
      error: {
        code: error.response ? error.response.data.error.code : 'unknown_error',
        message: error.response ? error.response.data.error.message : error.message,
      },
    });
  }
});

app.use("/.netlify/functions/api", router);

module.exports.handler = serverless(app);
