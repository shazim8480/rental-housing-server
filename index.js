require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

const cors = require("cors");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.raiw9.mongodb.net/?retryWrites=true&w=majority`;
// const uri = `mongodb://localhost:27017`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    const db = client.db("rental-housing");
    const propertyCollection = db.collection("properties");

    // get all books
    app.get("/api/properties", async (req, res) => {
      try {
        const cursor = propertyCollection.find({});
        const properties = await cursor.toArray();

        res.json({ status: true, data: properties });
      } catch (error) {
        console.error("Error fetching properties:", error.message);
        res
          .status(500)
          .json({ status: false, error: "Failed to fetch properties" });
      }
    });

    // add a book
    app.post("/api/add-property", async (req, res) => {
      const book = req.body;

      const result = await propertyCollection.insertOne(book);

      res.send(result);
    });

    // get property by id
    app.get("/api/property/:id", async (req, res) => {
      const id = req.params.id;

      const result = await propertyCollection.findOne({ _id: ObjectId(id) });
      console.log(result);
      res.send(result);
    });

    // update property by id //
    app.put("/api/update-property/:id", async (req, res) => {
      const propertyId = req.params.id;
      const updatedPropertyData = req.body;

      try {
        const result = await propertyCollection.updateOne(
          { _id: ObjectId(propertyId) },
          { $set: updatedPropertyData }
        );

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .json({ status: false, error: "Property not found" });
        }

        res.json({ status: true, message: "Property updated successfully" });
      } catch (error) {
        console.error("Error updating property:", error.message);
        res
          .status(500)
          .json({ status: false, error: "Failed to update property" });
      }
    });

    // delete property
    app.delete("/api/delete-property/:id", async (req, res) => {
      const id = req.params.id;

      const result = await propertyCollection.deleteOne({ _id: ObjectId(id) });
      console.log(result);
      res.send(result);
    });

    // review api
    //   app.post("/review/:id", async (req, res) => {
    //     const bookId = req.params.id;
    //     const review = req.body.review;

    //     console.log(bookId);
    //     console.log(review);

    //     const result = await productCollection.updateOne(
    //       { _id: ObjectId(bookId) },
    //       { $push: { reviews: review } }
    //     );

    //     console.log(result);

    //     if (result.modifiedCount !== 1) {
    //       console.error("book not found or review not added");
    //       res.json({ error: "book not found or review not added" });
    //       return;
    //     }

    //     console.log("review added successfully");
    //     res.json({ message: "review added successfully" });
    //   });

    // get reviews by specific user

    app.get("/review/:id", async (req, res) => {
      const bookId = req.params.id;

      const result = await booksCollection.findOne(
        { _id: ObjectId(bookId) },
        { projection: { _id: 0, reviews: 1 } }
      );

      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "book not found" });
      }
    });

    app.post("/user", async (req, res) => {
      const user = req.body;

      const result = await userCollection.insertOne(user);

      res.send(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;

      const result = await userCollection.findOne({ email });

      if (result?.email) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });
  } finally {
  }
};

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Welcome to bookstore mania!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
