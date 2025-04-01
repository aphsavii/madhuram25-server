import { getEvents, getPerformers, toggleVoting,submitJudgeScore } from "../controllers/index.controller.js";
import express from "express";
import auth from "../middleware/auth.middleware.js";
import { publishResult } from "../controllers/index.controller.js";

const router = express.Router();

router.get("/events", auth,getEvents);
router.get("/events/:eventId/performers", auth, getPerformers);
router.get("/events/:eventId/toggle-voting", auth, toggleVoting);
router.post("/events/:eventId/submit-judge-score", auth, submitJudgeScore);
router.post("/events/:eventId/publish-result", auth, publishResult);

export default router;