const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
// require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 8080;

// middleware========

app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@job-portal-db.2gfzjxm.mongodb.net/?retryWrites=true&w=majority&appName=job-portal-db`;
const uri = process.env.MONGO_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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
    // create db
    const db = client.db("job-portal-db");
    const jobCollections = db.collection("demoJobs");
    const userCollections = db.collection("User");

    // post a job

    app.post("/post-job", async (req, res) => {
      const body = req.body;
      body.createAt = new Date();
      //   console.log(body);
      const result = await jobCollections.insertOne(body);
      if (result.insertedId) {
        return res.status(200).send(result);
      } else {
        return res.status(404).send({
          message: "can not insert! try again later",
          status: "false",
        });
      }
    });

    // get all jobs
    app.get("/all-jobs", async (req, res) => {
      const jobs = await jobCollections.find().toArray();
      const sortedJobPosts = [...jobs].sort((a, b) => b.createAt - a.createAt);
      res.send(sortedJobPosts);
    });

    // get single job using id
    app.get("/all-jobs/:id", async (req, res) => {
      const id = req.params.id;
      const job = await jobCollections.findOne({ _id: new ObjectId(id) });
      res.send(job);
    });

    // get jobs by email
    app.get("/myJobs/:email", async (req, res) => {
      // console.log(req.params.email);
      const jobs = await jobCollections
        .find({ postedBy: req.params.email })
        .toArray();
      res.send(jobs);
    });

    // delete a job
    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await jobCollections.deleteOne(filter);
      res.send(result);
    });

    // update a jobs

    app.patch("/update-job/:id", async (req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...jobData,
        },
      };
      const result = await jobCollections.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // User Registration
    app.post("/register", async (req, res) => {
      const body = req.body;
      body.createdAt = new Date();

      // Check if email already exists
      const existingUser = await userCollections.findOne({ email: body.email });
      if (existingUser) {
        return res.status(400).send({
          message: "Email already exists",
          status: "false",
        });
      }

      const salt = await bcrypt.genSalt(10);
      body.password = await bcrypt.hash(body.password, salt);
      const result = await userCollections.insertOne(body);
      if (result.insertedId) {
        // Generate JWT token
        const token = jwt.sign(
          { userId: result.insertedId },
          process.env.JWT_SECRET,
          {
            expiresIn: "1h",
          }
        );
        return res.status(200).send({ user: body, token });
      } else {
        return res.status(500).send({
          message: "Cannot register user, try again later",
          status: "false",
        });
      }
    });

    // User Login
    app.post("/login", async (req, res) => {
      const body = req.body;
      const user = await userCollections.findOne({ email: body.email });
      if (user) {
        const isValid = await bcrypt.compare(body.password, user.password);
        if (isValid) {
          // Generate JWT token
          const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1h",
          });
          return res.status(200).send({ user, token });
        } else {
          return res.status(401).send({
            message: "Invalid email or password",
            status: "false",
          });
        }
      } else {
        return res.status(401).send({
          message: "Invalid email or password",
          status: "false",
        });
      }
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

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
