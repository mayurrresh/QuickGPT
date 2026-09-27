import User from "../models/user.js";
import jwt from "jsonwebtoken";
import Chat from "../models/Chat.js";

// generate jwt
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// ================= REGISTER =================
export const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    console.log("REGISTER BODY:", req.body); // 🔍 DEBUG

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing email or password",
      });
    }

    email = email.toLowerCase().trim();

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      password, // ⚠️ currently plain (we'll fix later)
    });

    console.log("USER CREATED:", user.email); // 🔍 DEBUG

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      token,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ================= LOGIN =================
export const loginUser = async (req, res) => {
  try {
    console.log("LOGIN BODY:", req.body); // 🔍 DEBUG

    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing email or password",
      });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    console.log("FOUND USER:", user ? user.email : "NO USER"); // 🔍 DEBUG

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 🔥 DEBUG password comparison
    console.log("Entered password:", password);
    console.log("Stored password:", user.password);

    let isMatch = false;

    // ✅ Try model method if exists
    if (user.comparePassword) {
      try {
        isMatch = await user.comparePassword(password);
        console.log("comparePassword result:", isMatch);
      } catch (err) {
        console.log("comparePassword failed:", err.message);
      }
    }

    // 🧨 FALLBACK (IMPORTANT for debugging)
    if (!isMatch) {
      isMatch = password === user.password;
      console.log("Fallback match result:", isMatch);
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    return res.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ================= GET USER =================
export const getUser = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error("GET USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ================= PUBLISHED IMAGES =================
export const getPublishedImages = async (req, res) => {
  try {
    const publishedImageMessages = await Chat.aggregate([
      { $unwind: "$messages" },
      {
        $match: {
          "messages.isImage": true,
          "messages.isPublished": true,
        },
      },
      {
        $project: {
          _id: 0,
          imageUrl: "$messages.content",
          username: "$userName",
        },
      },
    ]);

    return res.json({
      success: true,
      images: publishedImageMessages.reverse(),
    });
  } catch (error) {
    console.error("PUBLISHED IMAGES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};