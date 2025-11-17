require ("dotenv").config();
const express = require('express');
const cors = require('cors');
const requestRoutes = require('./routes/requestRoutes');
const approvalRoutes = require('./routes/approvalRoutes');

const app = express();
app.use(cors()); 
app.use(express.json()); 

app.use('/api', requestRoutes);
app.use('/api', approvalRoutes);

app.get('/', (req, res) => { 
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Summit Bank API</title> 
      <style>
        body {
          background: linear-gradient(135deg, #2f618aff, #C6B07D);
          color: white;
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
        }
        h1 {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }
        p { 
          font-size: 1.2rem;
          opacity: 0.9;
        } 
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Summit Bank API</h1>
        <p>Welcome to the Access Request Portal Backend</p>
      </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));  
