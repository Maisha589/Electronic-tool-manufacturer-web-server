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

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized" })
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JSON_WEB_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.send(403).send({ message: Forbidden })
        }
        req.decoded = decoded;
        next();
    });

}


async function run() {
    try {
        await client.connect();
        const toolCollection = client.db("electronic_tool").collection("tools");
        const bookingCollection = client.db("electronic_tool").collection("bookings");
        const userCollection = client.db("electronic_tool").collection("users");

        // user data
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: { user }
            }
            const token = jwt.sign({ email: email }, process.env.JSON_WEB_TOKEN_SECRET, { expiresIn: "1h" })
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send({ result, token });
        })

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
        app.get("/booking", verifyJWT, async (req, res) => {
            const clientEmail = req.query.clientEmail;
            const decodedEmail = req.decoded.email;
            if (clientEmail === decodedEmail) {
                const query = { clientEmail: clientEmail };
                const booking = await bookingCollection.find(query).toArray();
                res.send(booking);
            }
            else {
                return res.status(403),
                    send({ message: "Forbidden" })
            }

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