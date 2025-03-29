import { getEvents,getPerformers } from "../controllers/index.controller.js";
import express from "express";

const router = express.Router();

router.get("/events", getEvents);
router.get("/events/:eventId/performers", getPerformers);

export default router;