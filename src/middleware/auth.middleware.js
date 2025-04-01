import { jwtDecode } from "jwt-decode";
import { admins, judges } from "../constants.js";

const auth = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        console.log("No token found");
        return res.status(401).json({ success: false, message: "Unauthorized token" });
    }
    // console.log(token);
    try {

        const decoded = jwtDecode(token);
        const isAdmin = admins.includes(decoded.email);
        const isJudge = judges.includes(decoded.email);
        const user = { email: decoded.email, isAdmin, isJudge };
        req.user = user;
        console.log(decoded.email);
        if (!decoded.email.includes("sliet.ac.in")) {
            return res.status(401).json({ success: false, message: "Unauthorized " });
        }
    } catch (error) {
        console.log(error);
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    next();
}

export default auth;