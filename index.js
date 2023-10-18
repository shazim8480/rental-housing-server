require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
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
    const userCollection = db.collection("users");
    const registeredUsersCollection = db.collection("registered-users");

    // get all properties
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

    // add a property
    app.post("/api/add-property", async (req, res) => {
      const property = req.body;

      const result = await propertyCollection.insertOne(property);

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

    // *** Registered users collection //
    // register a user to the "registered-users" collection
    app.post("/api/register-user", async (req, res) => {
      const user = req.body;

      try {
        // Insert the user into the collection
        const result = await registeredUsersCollection.insertOne(user);

        // Check if the insertion was successful
        if (result.insertedCount === 1) {
          // User successfully added
          res
            .status(200)
            .json({ status: "success", message: "Registered successfully" });
        } else {
          // Failed to add user
          res
            .status(500)
            .json({ status: "error", message: "Failed to register user" });
        }
      } catch (error) {
        console.error("Error adding user to collection:", error);
        res
          .status(500)
          .json({ status: "error", message: "Internal Server Error" });
      }
    });

    // get all the registered users
    app.get("/api/get-registered-users", async (req, res) => {
      try {
        // Find all users in the collection
        const users = await registeredUsersCollection.find({}).toArray();

        // Send success response with users
        res.status(200).json({
          success: true,
          message: "Successfully fetched registered users",
          data: users,
        });
      } catch (error) {
        console.error("Error getting users from collection:", error);

        // Send error response
        res.status(500).json({
          success: false,
          message: "Internal Server Error",
          error: error.message, // Optionally, you can include the error message
        });
      }
    });

    // ***** User section ***********
    // Signup API
    app.post("/api/signup", async (req, res) => {
      try {
        const { name, email, password } = req.body;

        // Check if password is provided
        if (!password) {
          return res
            .status(400)
            .json({ status: false, error: "Password is required" });
        }

        // Check if a user with the given email already exists
        const existingUser = await userCollection.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            status: false,
            error: "User with this email already exists",
          });
        }

        // Generate a salt and hash the password with bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Assuming you have a user collection and are adding a new user
        const user = {
          name,
          email,
          password: hashedPassword, // Store the hashed password
          profileData: {
            accountRole: "default",
          },
        };

        const result = await userCollection.insertOne(user);

        if (result.insertedCount === 1) {
          // For demonstration purposes, assuming successful signup
          res.json({
            status: true,
            accountRole: user?.profileData?.accountRole,
          });
          console.log("user inserted count", result.insertedCount);
          console.log("User added successfully", result);
        } else {
          console.error("Failed to insert user:", result);
          res.status(500).json({
            status: false,
            error: "Failed to add user",
            mongoError:
              result && result.errmsg ? result.errmsg : "Unknown error",
          });
        }
      } catch (error) {
        console.error("Error during signup:", error.message);
        res.status(500).json({ status: false, error: "Signup failed" });
      }
    });

    // Sign-in API
    app.post("/api/login", async (req, res) => {
      try {
        const { email, password } = req.body;

        // Assuming you have a user collection
        const user = await userCollection.findOne({ email });

        if (!user) {
          return res
            .status(401)
            .json({ status: false, error: "Invalid credentials" });
        }

        // Compare the provided password with the hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return res
            .status(401)
            .json({ status: false, error: "Invalid credentials" });
        }

        // For demonstration purposes, you might want to generate and return a token here
        // You can use a library like jsonwebtoken to generate tokens

        // Assuming successful sign-in
        res.json({ status: true, accountRole: user.profileData.accountRole });
      } catch (error) {
        console.error("Error during sign-in:", error.message);
        res.status(500).json({ status: false, error: "Sign-in failed" });
      }
    });

    // User Profile Update API
    app.put("/api/update-profile/:id", async (req, res) => {
      const userId = req.params.id;
      const updatedProfileData = req.body.profileData;

      try {
        // Assuming you have a user collection and are updating the user profileData
        const result = await userCollection.updateOne(
          { _id: ObjectId(userId) },
          { $set: { profileData: updatedProfileData } }
        );

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .json({ status: false, error: "User not found" });
        }

        res.json({
          status: true,
          message: "User profile updated successfully",
        });
      } catch (error) {
        console.error("Error updating user profile:", error.message);
        res
          .status(500)
          .json({ status: false, error: "Failed to update user profile" });
      }
    });
  } finally {
  }
};

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Welcome to Rental Housing Server!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
