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
    // register a user to the selected property
    app.post("/api/register-user", async (req, res) => {
      const user = req.body;

      try {
        // Insert the user into the collection
        const result = await registeredUsersCollection.insertOne(user);
        console.log("inserted registered user count", result.insertedCount);

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

        // Create a new user object without hashing the password
        const newUser = {
          name,
          email,
          password, // Store password as provided
          profileData: {
            accountRole: "default",
          },
        };

        // Insert the new user into the collection
        const result = await userCollection.insertOne(newUser);
        console.log("app.post ~ result:", result);
        res.json({
          status: 200,
          name: newUser.name,
          email: newUser.email,
          accountRole: newUser.profileData.accountRole,
        });
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

        // Compare the provided password directly with the password in the database
        if (password !== user.password) {
          return res
            .status(401)
            .json({ status: false, error: "Invalid credentials" });
        }

        // For demonstration purposes, you might want to generate and return a token here
        // You can use a library like jsonwebtoken to generate tokens

        // Assuming successful sign-in
        console.log("user signed in successfully", user);
        res.json({
          status: true,
          name: user.name,
          email: user.email,
          accountRole: user.profileData.accountRole,
        });
      } catch (error) {
        console.error("Error during sign-in:", error.message);
        res.status(500).json({ status: false, error: "Sign-in failed" });
      }
    });

    // Get Profile by Email API
    app.get("/api/get-profile", async (req, res) => {
      const email = req.query.email; // Assuming email is passed as a query parameter

      try {
        // Assuming you have a user collection and are searching by email
        const user = await userCollection.findOne({ email: email });

        if (!user) {
          return res
            .status(404)
            .json({ status: false, error: "User not found" });
        }
        console.log("user profile fetched successfully", user);
        res.json({
          status: true,
          userProfile: user.profileData, // Assuming user has a field named 'profileData'
        });
      } catch (error) {
        console.error("Error fetching user profile by email:", error.message);
        res.status(500).json({
          status: false,
          error: "Failed to fetch user profile by email",
        });
      }
    });

    // User Profile Update API
    app.put("/api/update-profile", async (req, res) => {
      const email = req.body.email; // Assuming email is sent in the request body
      const updatedProfileData = req.body.profileData;

      try {
        // Assuming you have a user collection and are updating the user profileData by email
        const result = await userCollection.updateOne(
          { email: email },
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
        console.error("Error updating user profile by email:", error.message);
        res.status(500).json({
          status: false,
          error: "Failed to update user profile by email",
        });
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
