import { performersData, eventsData } from "../constants.js";
import { redisService } from "../app.js";
import { jwtDecode } from "jwt-decode";
const getPerformers = async (req, res) => {
    const { eventId } = req.params;
    const token = req.headers.authorization;
    const decodedToken = jwtDecode(token);
    const email = decodedToken.email;
    const performers = performersData[eventId];
    try {
        if(!performers) {
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
        res.status(200).json({ success: true, data, votedId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getEvents = (req, res) => {
    res.status(200).json({ success: true, data: eventsData });
};

export { getPerformers, getEvents };