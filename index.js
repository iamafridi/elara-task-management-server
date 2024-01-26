const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const port = 5000;

const secret = "xyzyzxmbauebaoefh43234325bjhhbi";

// Parser/ middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
// DB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7grn8zj.mongodb.net/?retryWrites=true&w=majority`;

// MongoDB Connection
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Connect Collection
    const serviceCollection = client.db("elara-task").collection("services");
    const bookingCollection = client.db("elara-task").collection("bookings");

    // Middle Ware
    // verify Token
    const gateman = (req, res, next) => {
      const { token } = req.cookies;

      // if client doesnt send token
      if (!token) {
        return res.status(401).send({ message: "Unauthorized" });
      }
      // verify token here
      jwt.verify(token, secret, function (err, decoded) {
        if (err) {
          return res.status(401).send({ message: "Unauthorized" });
        }
        req.user = decoded;
        next();
      });
    };

    // Getting Services here
    app.get("/api/v1/services", async (req, res) => {
      let queryObj = {};
      let sortObj = {};
      const category = req.query.category;
      const sortField = req.query.sortField;
      const sortOrder = req.query.sortOrder;

      if (category) {
        queryObj.category = category;
      }
      if (sortField && sortOrder) {
        sortObj[sortField] = sortOrder;
      }

      const cursor = serviceCollection.find(queryObj).sort(sortObj);
      const result = await cursor.toArray();

      res.send(result);
    });

    // Booking Here
    app.post("/api/v1/user/create-booking", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });
    //user specific Booking Here
    app.get("/api/v1/user/bookings", gateman, async (req, res) => {
      const queryEmail = req.query.email;
      const tokenEmail = req.user.email;

      if (queryEmail !== tokenEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      // email Specific
      let query = {};
      if (queryEmail) {
        query.email = queryEmail;
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // Deleting here
    app.delete("/api/v1/user/cancel-booking/:bookingId", async (req, res) => {
      const id = req.params.bookingId;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // JWT
    app.post("/api/v1/auth/access-token", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, secret, { expiresIn: 60 * 60 });

      // Setting in cookie
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// respond with "hello world" when a GET request is made to the homepage

app.listen(port, () => {
  console.log(`Task management is working on port ${port}`);
});
