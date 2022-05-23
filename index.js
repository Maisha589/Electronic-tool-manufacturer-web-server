const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");

// middle ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.mqmnn.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolCollection = client.db("electronic_tool").collection("tools");
        const bookingCollection = client.db("electronic_tool").collection("bookings");

        // All tools
        app.get("/tools", async (req, res) => {
            const query = {};
            const cursor = toolCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools);
        })

        // single tool
        app.get("/purchase/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const purchase = await toolCollection.findOne(query);
            res.send(purchase);
        })

        // get booking data
        app.get("/booking", async (req, res) => {
            const clientEmail = req.query.clientEmail;
            const query = { clientEmail: clientEmail };
            const booking = await bookingCollection.find(query).toArray();
            res.send(booking);
        })

        // booking data 
        app.post("/booking", async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })


    }
    finally {

    }

}
run().catch(console.dir);
app.get("/", async (req, res) => {
    res.send("Hello from electronic tools")
})

app.listen(port, () => {
    console.log(`Electronic tool listening on port ${port}`)
})