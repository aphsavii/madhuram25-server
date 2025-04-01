import { redisService } from "../app.js";

const voteController = async (socket) => {
  try {
    // console.log(`🗳️ New voter connected: ${socket.id}`);

    // Handle vote event
    socket.on("vote", async (data) => {
      try {
        if (!socket.user) {
          console.warn("⚠️ Unauthorized vote attempt");
          socket.emit("vote:error", { message: "Unauthorized" });
          return;
        }

        const { email, id: userId } = socket.user;
        const { eventId, performanceId } = data;

        if (!eventId || !performanceId) {
          console.warn("⚠️ Invalid vote data:", data);
          // socket.emit("vote:error", { message: "Invalid vote data" });
          return;
        }

        const isVotingAllowed = await redisService.get(`voting-allowed:${eventId}`);
        if (!isVotingAllowed) {
          console.warn("⚠️ Voting is not allowed for event", eventId);
          socket.emit("vote:error", { message: "Voting has not started yet." });
          return;
        }

        // Create Redis keys
        const voteKey = `vote:${eventId}:${email}`; 
        const votesKey = `votes:${performanceId}`; 

        // Check if the user has already voted
        if (await redisService.exists(voteKey)) {
          console.log(`🔄 User ${email} already voted for event ${eventId}`);
          const previousVote = await redisService.get(voteKey);

          // Send "already voted" message to the sender only
          socket.emit("vote:alreadyVoted", {
            performanceId: previousVote,
            user: { userId, email },
          });
          return;
        }

        // Atomically increment the vote count
        const updatedVotes = await redisService.incr(votesKey);

        // Save the user's vote (No expiration)
        await redisService.set(voteKey, performanceId);

        console.log(`✅ Vote recorded for performance ${performanceId} by ${email}`);

        // Prepare vote data
        const voteData = {
          eventId,
          performanceId,
          votes: updatedVotes,
        };

        // Publish the vote event
        redisService.publish("votes", voteData);
      } catch (error) {
        console.error("❌ Error processing vote:", error);
        socket.emit("vote:error", { message: "Internal server error" });
      }
    });



    // Subscribe to vote updates and send to all clients (including sender)
    redisService.subscribe("votes", (vote) => {
      console.log(`🔔 Broadcasting vote update:`, vote);

      // Send vote to ALL clients (including the sender)
      socket.app.io.emit(`vote:${vote.eventId}`, vote);
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
      console.log(`🔌 Voter disconnected: ${socket.id}`);
    });
  } catch (error) {
    console.error("❌ Error in voteController:", error);
  }
};

export default voteController;