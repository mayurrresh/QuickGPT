import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./configs/db.js";
import userRouter from "./routes/userRoutes.js";
import chatRouter from "./routes/chatRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import creditRouter from "./routes/creditRoutes.js";


const app = express();

// ---- DB (SAFE) ----
connectDB().catch((err) => {
  console.error("MongoDB connection error:", err.message);
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
      "https://quick-gpt-git-main-mayuresh-kahars-projects.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

// ---- BODY PARSER ----
app.use(express.json());

// ---- ROUTES ----
app.get("/", (req, res) => res.send("Server is live!"));
app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);
app.use("/api/message", messageRouter);
app.use("/api/credit", creditRouter);

// ---- EXPORT (NO app.listen) ----
export default app;
