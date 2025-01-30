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
    
    const { qty, success_url, failed_url, ticketId } = req.body;
    const {idempotencykey} = req.headers;
    

    // const payload = {
    //   qty : qty,
    //   success_url: successUrl,
    //   failed_url: failedUrl,
    // };
    // console.log(payload);
    
    // const signature = generateSignature(JSON.stringify(payload));
    
    const response = await axios.post(
      `${favourseApiBaseUrl}/invoice/checkout`,
      {
        qty : qty,
        success_url: success_url,
        failed_url: failed_url,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'champ-sign-key': process.env.KEY,
          'Idempotency-Key' : `${idempotencykey}`
        },
      }
    );
    console.log(response);
    
    

    const responseBody = {
      success : response.data.success,
      invoice_url: response.data.data.invoice_url,
      invoice_id: response.data.data.invoice_id,
    };

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(responseBody);

  } catch (error) {
    console.error(error);
    console.error('Error creating checkout session:', error.response ? error.response.data : error.message);
    res.status(500).json({
      error : error.response.data
    });
  }
});

router.post('/payment/status', async (req, res) => {
  try {
    const { invoiceId } = req.body;
    const {idempotencykey} = req.headers;
    // const signatureX = generateSignature(JSON.stringify({invoiceId : invoiceId}));

    const response = await axios.post(
      `${favourseApiBaseUrl}/status`,
      { invoiceId },
      {
        headers: {
          'Content-Type': 'application/json',
          'champ-sign-key': process.env.KEY,
          'Idempotency-Key' : `${idempotencykey}`
        },
      }
    );
    console.log(response.data); 
    

    const responseBody = {
      transactionStatus: response.data.transactionStatus,  
      transactionDetails: response.data.details,
    };
    

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(responseBody);

  } catch (error) {
    console.error(error);
    console.error('Error retrieving transaction status:', error.response ? error.response.data : error.message);
    res.status(500).json({
      error: error.response.data
    });
  }
});

app.use("/.netlify/functions/api", router);

module.exports.handler = serverless(app);
