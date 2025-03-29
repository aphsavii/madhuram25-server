import { performersData, eventsData } from "../constants.js";
import { redisService } from "../app.js";
const getPerformers = async (req, res) => {
    const { eventId } = req.params;
    const performers = performersData[eventId];
    try {
        const votes = await Promise.all(performers.map(async (performer) => {
            const votesKey = `votes:${performer.id}`;
            const votes = await redisService.get(votesKey);
            return votes || 0;
        }));
        const data = performers.map((performer, index) => ({
            ...performer,
            votes: votes[index],
        }));
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getEvents = (req, res) => {
    res.status(200).json({ success: true, data: eventsData });
};

export { getPerformers, getEvents };