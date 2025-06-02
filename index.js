const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.abrfq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db('BistroBoss').collection('menu');
    const cartCollection = client.db('BistroBoss').collection('carts');

    app.get('/menu', async(req, res) => {
        const result = await menuCollection.find().toArray();
        res.send(result)
    })

    app.get('/all-menu', async(req, res) => {
      let page = parseInt(req.query.page) || 1
      let size = parseInt(req.query.size) || 5
      console.log('page', page ,'size', size)
      console.log('pagination',req.query)

      if (isNaN(page) || page < 1) page = 1;
  if (isNaN(size) || size < 1) size = 5;

        const result = await menuCollection.find()
        .skip((page - 1) * size)
        .limit(size)
        .toArray();
        res.send(result)
    })

    app.get('/menuCount', async(req, res) => {
        const result = await menuCollection.estimatedDocumentCount()
        res.send({count: result})
    })

    app.post('/carts', async(req, res) => {
      const cartItem = req.body
      const result = await cartCollection.insertOne(cartItem);
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Bistro boss is running')
})

app.listen(port, () => {
    console.log(`Bistro boss is running on port ${port}`)
})