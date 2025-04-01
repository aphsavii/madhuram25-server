import { performersData, eventsData } from "../constants.js";
import { redisService } from "../app.js";
import { judges } from "../constants.js";

const getPerformers = async (req, res) => {
    const { eventId } = req.params;
    const email = req?.user?.email;
    const performers = performersData[eventId];

    try {
        if (!performers) {
            throw new Error("Event not found");
        }
        const key = `vote:${eventId}:${email}`;
        const votedId = await redisService.get(key);

        const votes = await Promise.all(performers.map(async (performer) => {
            const votesKey = `votes:${performer.id}`;
            const votes = await redisService.get(votesKey);
            return votes || 0;
        }));
        const data = performers.map((performer, index) => ({
            ...performer,
            votes: votes[index],
        }));
        let judgeScores = {};
        if (req?.user?.isJudge) {
            const key = `judge-scores:${eventId}:${email}`;
            const js = await redisService.get(key) || [];
            js.forEach((score) => {
                judgeScores[score.performerId] = score.score;
            });
        }
        const vottingAllowed = await redisService.get(`voting-allowed:${eventId}`) || false;
        res.status(200).json({ success: true, data, votedId, vottingAllowed, judgeScores });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};



const toggleVoting = async (req, res) => {
    const { eventId } = req.params;
    if (!req?.user?.isAdmin) return res.status(401).json({ success: false, message: "Unauthorized" });
    const vottingAllowed = await redisService.get(`voting-allowed:${eventId}`) || false;
    await redisService.set(`voting-allowed:${eventId}`, !vottingAllowed);
    res.status(200).json({ success: true, vottingAllowed: !vottingAllowed });
};

const getEvents = async (req, res) => {
    try {
        const data = await Promise.all(eventsData.map(async (event) => {
            const isVotingAllowed = await redisService.get(`voting-allowed:${event.id}`) || false;
            return {
                ...event,
                isVotingAllowed,
            };
        }));
        res.status(200).json({ success: true, data, isAdmin: req?.user?.isAdmin, isJudge: req?.user?.isJudge });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const submitJudgeScore = async (req, res) => {
    try {
        const { eventId } = req.params;
        const email = req?.user?.email;
        if (!req?.user?.isJudge) return res.status(401).json({ success: false, message: "Unauthorized" });
        const { performerId, score } = req.body;
        if (!performerId || !score) return res.status(400).json({ success: false, message: "Invalid data" });


        const key = `judge-scores:${eventId}:${email}`;
        const scores = await redisService.get(key) || [];
        let already = false;
        scores.forEach((s) => {
            if (s.performerId === performerId) {
                already = true;
                return;
            }
        });
        if (already) {
            return res.status(400).json({ success: false, message: "Score already submitted" });
        }
        scores.push({ performerId, score });
        await redisService.set(key, scores);
        res.status(200).json({ success: true, message: "Score recorded" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

const publishResult = async (req, res) => {
    const eventId = req.params.eventId;
    if (!req?.user?.isAdmin) return res.status(401).json({ success: false, message: "Unauthorized" });

    try {
        let judgeAvgScores = {};
        performersData[eventId].forEach((performer) => {
            judgeAvgScores[performer.id] = 0;
        });

        // Using Promise.all to wait for all judge score fetches
        await Promise.all(judges.map(async (judge) => {
            const key = `judge-scores:${eventId}:${judge}`;
            const js = await redisService.get(key) || [];
            console.log(`Judge scores for ${judge}:`, js);

            js.forEach((score) => {
                if (judgeAvgScores[score.performerId] !== undefined) {
                    judgeAvgScores[score.performerId] += score.score;
                }
            });
        }));

        // Calculate average scores
        for (let key in judgeAvgScores) {
            judgeAvgScores[key] = judgeAvgScores[key] / judges.length;
        }
        console.log("Average Scores:", judgeAvgScores);

        // Now get the votes of each performer
        let votes = {};
        let totalVotes = 0;

        await Promise.all(performersData[eventId].map(async (performer) => {
            const votesKey = `votes:${performer.id}`;
            let v = Number(await redisService.get(votesKey)) || 0; // Convert to number
            votes[performer.id] = v;
            totalVotes += v;
        }));

        console.log("Initial Votes:", votes, "Total Votes:", totalVotes);

        // Now calculate the final votes based on the judge scores
        Object.keys(judgeAvgScores).forEach((key) => {
            const score = judgeAvgScores[key];
            votes[key] += Math.ceil(((score / 10) * 100) * totalVotes / 100);
        });

        console.log("Final Votes:", votes);

        // Publish the result to Redis (Fix: await publish & stringify data)
        await Promise.all(Object.keys(votes).map(async (key) => {
            const votesKey = `votes:${key}`;
            await redisService.set(votesKey, votes[key]);

            const message = { eventId, performanceId: key, votes: votes[key] };
            await redisService.publish("votes", message);

            console.log(`Published to Redis:`, message);
        }));

        res.status(200).json({ success: true, message: "Result published" });

    } catch (error) {
        console.error("Error publishing results:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};



export { getPerformers, getEvents, toggleVoting, submitJudgeScore, publishResult };