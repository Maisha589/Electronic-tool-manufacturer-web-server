const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId, ObjectID } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// middle ware

// const corsConfig = {
//     origin: ["https://sheltered-garden-62351.herokuapp.com/"],
//     Credential: true,
//     methods: ["GET", "POST", "DELETE", "PUT"]
// }

app.use(cors());

// app.use(cors(corsConfig));
// app.options("*", cors(corsConfig))
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mqmnn.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// json web token
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized" })
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JSON_WEB_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden" })
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
        const reviewCollection = client.db("electronic_tool").collection("reviews");
        const paymentCollection = client.db("electronic_tool").collection("payments");

        // middleware verifyAdmin
        // const verifyAdmin = async (req, res, next) => {
        //     const requester = req.decoded.email;
        //     const requesterAccount = await userCollection.findOne({ email: requester });
        //     if (requesterAccount.role) {
        //         next();
        //     }
        //     else {
        //         res.status(403).send({ message: 'forbidden' });
        //     }
        // }

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

        // All user data
        app.get("/user", async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        // delete a user
        app.delete("/user/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            // const filter = { id: id };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        // update a user to admin 
        app.put("/user/admin/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            const filter = { email: email };
            const updateDoc = {
                $set: { role: "admin" },
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // update a user details

        // Only for admin
        app.get("/admin/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role;
            // console.log(isAdmin);
            res.send({ admin: isAdmin });
        })

        // All tools
        app.get("/tools", verifyJWT, async (req, res) => {
            const query = {};
            const cursor = toolCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools);
        })

        // Delete a tool
        app.delete("/tools/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            // const filter = { id: id };
            const result = await toolCollection.deleteOne(query);
            res.send(result);
        })

        // tools add
        app.post("/tools", verifyJWT, async (req, res) => {
            const tool = req.body;
            const result = await toolCollection.insertOne(tool);
            res.send(result);
        })

        // single purchase
        app.get("/purchase/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const purchase = await toolCollection.findOne(query);
            res.send(purchase);
        })

        // get all booking order data
        app.get("/booking", async (req, res) => {
            const bookings = await bookingCollection.find().toArray();
            res.send(bookings);
        })


        // get booking data per user
        app.get("/booking/user", verifyJWT, async (req, res) => {
            const clientEmail = req.query.clientEmail;
            const decodedEmail = req.decoded.email;
            if (clientEmail === decodedEmail) {
                const query = { clientEmail: clientEmail };
                const booking = await bookingCollection.find(query).toArray();
                res.send(booking);
            }
            else {
                return res.status(403).send({ message: "Forbidden" })
            }
        })

        // get booking for payment
        app.get("/booking/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking);
        })

        // book data 
        app.post("/booking", async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        // Cancel a  order
        app.delete("/booking/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            // const filter = { id: id };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })

        // Get review
        app.get("/review", async (req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send(reviews);
        })

        // Add review
        app.post("/review", async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })

        // Payment=intent API
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const tool = req.body;
            const price = tool.totalPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        app.patch("/booking/:id", async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectID(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await bookingCollection.updateOne(filter, updatedDoc);
            res.send(updatedBooking);
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