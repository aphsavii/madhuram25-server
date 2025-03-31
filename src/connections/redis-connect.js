import { createClient } from 'redis';
const client = createClient({
    // username: process.env.REDIS_USERNAME,
    // password: process.env.REDIS_PASSWORD,
    socket: {
        host: "localhost", 
        port: "6379"
    }
});


export default client;

