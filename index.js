const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middle ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.mqmnn.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolCollection = client.db("electronic_tool").collection("tools");
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