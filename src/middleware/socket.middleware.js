import { jwtDecode } from "jwt-decode";
const socketAuth = async (socket, next) => {
    const { token } = socket.handshake.auth;
    if (!token) {
        return next(new Error("Authentication error"));
    }
    try {
        const decoded = jwtDecode(token);
        socket.user = decoded;
        if(!decoded.email.includes("sliet.ac.in")) {
            return next(new Error("Authentication error"));
        }
    } catch (error) {
        return next(new Error("Authentication error"));
    }
    next();
}

export default socketAuth;