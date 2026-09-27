import express from "express";
import { protect } from "../middlewares/auth.js";

import {
    textMessageController,
    imageMessageController,
} from "../controllers/messageController.js";

const messageRouter = express.Router();

messageRouter.post(
    "/text",
    protect,
    textMessageController
);

messageRouter.post(
    "/image",
    protect,
    (req, res, next) => {
        console.log("🔥 IMAGE ROUTE HIT");
        next();
    },
    imageMessageController
);

export default messageRouter;