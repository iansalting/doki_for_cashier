import dotenv from "dotenv";
import Config from "../config/config.js";
import jwt from "jsonwebtoken";

dotenv.config();

const verifyToken = (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    

    console.log("Headers received:", req.headers);
    console.log("Auth header:", authHeader);

    if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
        console.log("Token extracted:", token);
    }

    if (!token) {
        console.log("No token found");
        return res.status(401).json({ message: "No Token, Authorization denied" });
    }

    try {
        const decode = jwt.verify(token, Config.accessTokenSecret);
        
        req.user = { 
            id: decode._id || decode.id, 
            role: decode.role 
        };

        next();
    } catch (err) {
        return res.status(401).json({ message: "Token is not valid" });
    }
};

export default verifyToken;