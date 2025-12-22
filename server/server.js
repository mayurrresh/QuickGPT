app.use(
  cors({
    origin: [
      "http://localhost:5173",          // local dev
      "https://your-frontend.vercel.app" // Vercel domain
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
