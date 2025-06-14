const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const userCollection = client.db('BistroBoss').collection('users');
    const cartCollection = client.db('BistroBoss').collection('carts');

    
    // jwt related api
    app.post('/jwt', async(req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({token})
    })

    // middleware
    const verfyToken = (req, res, next) => {
      console.log('inside verify token---', req.headers.authorization)
      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if(error){
          return res.status(401).send({message: 'unauthorized access'})
        }
        req.decoded = decoded
        next()
      })
    }

    const verfyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
    }

    // menu related apis
    app.get('/menu', async(req, res) => {
        const result = await menuCollection.find().toArray();
        res.send(result)
    })

    app.post('/menu', verfyToken, verfyAdmin, async(req, res) => {
      const menuItem = req.body
      const result = await menuCollection.insertOne(menuItem)
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

    // cart collection
    app.get('/carts', async(req, res) => {
      const email = req.query.email
      const query = { email: email }
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/carts', async(req, res) => {
      const cartItem = req.body
      const result = await cartCollection.insertOne(cartItem);
      res.send(result)
    })

    app.delete('/carts/:id', async(req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })


    // user related apis
    app.post('/users', async(req, res ) => {
      const user = req.body
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser){
        return res.send({message: 'User already exists', insertedId: null})
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users',verfyToken, verfyAdmin, async(req, res) => {
      console.log(req.headers)
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.patch('/users/admin/:id', async(req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    app.get('/users/admin/:email', verfyToken, async(req, res) => {
      const email = req.params.email
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }

      const quary = { email: email}
      const user = await userCollection.findOne(quary)
      let admin = false
      if(user){
        admin = user?.role === 'admin'
      }
      res.send({admin})
    })

    app.delete('/users/:id', verfyToken, verfyAdmin, async(req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id)}
      const result = await userCollection.deleteOne(query)
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