require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// MongoDB connection
mongoose
  .connect(process.env.MONGO_CLIENT_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.error("DB CONNECTION ERROR:", err);
  });

// Middleware
app.use(express.json());
app.use(cors());

// User schema
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Order schema
const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  productName: { type: String, required: true },
});

const Order = mongoose.model("Order", orderSchema);

// Routes
// Create a new order
app.post("/create-order", async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).send({ success: true, data: newOrder });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// User signup
app.post("/account/signup", async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    // Validate input
    if (!fullName || !username || !email || !password) {
      return res
        .status(400)
        .send({ success: false, message: "All fields are required." });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .send({ success: false, message: "Email already in use." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      fullName,
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).send({
      success: true,
      message: "Signup successful.",
      data: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        token,
      },
    });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// Get all orders
app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find({});
    res.status(200).send({ success: true, data: orders });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});
app.post("/account/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .send({ success: false, error: "Email and password are required." });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .send({ success: false, error: "Invalid login credentials." });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .send({ success: false, error: "Invalid login credentials." });
    }
    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: "1h" } 
    );
    return res
      .status(200)
      .send({ success: true, message: "Login successful.", data: {
        id: user._id,
        token,
      }, });
  } catch (error) {
    return res
      .status(500)
      .send({ success: false, error: "An error occurred. Please try again." });
  }
});



// Root route
app.get("/", (req, res) => {
  res.send({ success: true, message: "API is running." });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
