import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { router } from "./routes/index.js";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(router);

app.listen(port, () => {
  console.log(`AwardBlock API listening on port ${port}`);
});
