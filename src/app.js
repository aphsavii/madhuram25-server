import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import redisService from "./services/redis.service.js";
import voteController from "./controllers/vote.controller.js";
import cors from "cors";
import socketAuth from "./middleware/socket.middleware.js";
import router from "./routes/routes.js";
class App {
  pm2Instance = process.env.NODE_APP_INSTANCE || 0;
  PORT = (process.argv[2] || 3000) + Number(this.pm2Instance);
  constructor() {
    this.app = express();
    this.server = createServer(this.app);

    // Apply CORS for Express
    const env = process.env.NODE_ENV || "prod";
    if (env === "dev") {
      this.app.use(
        cors({
          origin: "*",
          methods: ["GET", "POST"],
          credentials: true,
        })
      );

      // Apply CORS for Socket.IO
      this.io = new Server(this.server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
          credentials: true,
        },
      });
    }
    else {
      this.io = new Server(this.server);
    }

    this.io.use(socketAuth);
    this.app.use(express.static("public"));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true, limit: "16kb" }));
    this.app.use(router);

    this.app.get("/", (req, res) => {
      const text = "Hello World from instance " + this.pm2Instance;
      console.log(text);
      res.send(text);
      // res.send("Hello World from instance"+ this.pm2Instance);
    });
  }

  async run() {
    // Connect Redis
    await redisService.connect();

    // Set up Redis adapter for Socket.IO
    this.io.adapter(redisService.getAdapter());

    // Socket.IO Events
    this.io.on("connection", (socket) => {
      console.log("A user connected", socket.id);

      // Attach the entire app instance to the socket
      socket.app = this;

      voteController(socket);
    });

    this.server.listen(this.PORT, () => {
      console.log("Server is running on port", this.PORT);
    });
  }
}

const app = new App();
const io = app.io;

export { app as default, io, redisService };