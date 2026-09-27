import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./configs/db.js";
import userRouter from "./routes/userRoutes.js";
import chatRouter from "./routes/chatRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import creditRouter from "./routes/creditRoutes.js";
import  { stripeWebhooks } from "./controllers/webhooks.js";
import webSearch from "./services/webSearch.js";


const app = express();

// ---- DB (SAFE) ----
connectDB().catch((err) => {
  console.error("MongoDB connection error:", err.message);
});

app.get("/api/test-search", async (req, res) => {
  try {
    const results = await webSearch("latest football news");

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ---- STRIPE WEBHOOK (MUST BE FIRST) ----
app.post(
  "/api/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhooks
);

// ---- CORS (NO THROWING) ----
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://quick-gpt-jade.vercel.app",
      "https://quick-gpt-git-main-mayuresh-kahars-projects.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("/", cors());

// ---- BODY PARSER ----
app.use(express.json());

// ---- ROUTES ----
app.get("/", (req, res) => res.send("Server is live!"));
app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);
app.use("/api/message", messageRouter);
app.use("/api/credit", creditRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
