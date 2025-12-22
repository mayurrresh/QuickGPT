// ----- CORS CONFIG (FIXED) -----
const allowedOrigins = [
  "http://localhost:5173",
  "https://quick-gpt-git-main-mayuresh-kahars-projects.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server / Postman
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// allow preflight requests
app.options("*", cors());
