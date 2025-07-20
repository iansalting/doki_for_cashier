import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import Config from '../config/config.js';



const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return next(createHttpError(400, "All fields are required"));
    }

    const users = {
      admin: { password: "admin", role: "admin" },
      superadmin: { password: "superadmin", role: "superadmin" },
    };

    const user = users[username];

    if (!user || user.password !== password) {
      return next(createHttpError(401, "Invalid credentials"));
    }


    const token = jwt.sign(
      { username, role: user.role },
      Config.accessTokenSecret,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      token,
      user: {
        username,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};


const getUserData = async (req, res, next) => {
  try {
    const { username, role } = req.user;

    if (!username || !role) {
      return next(createHttpError(401, "Unauthorized"));
    }

    res.status(200).json({
      success: true,
      data: {
        username,
        role,
      },
    });
  } catch (error) {
    next(error);
  }
};



const verifyUser = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return next(createHttpError(400, "Password is required"));
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(createHttpError(401, "No token provided"));
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, Config.accessTokenSecret);

    const users = {
      admin: { password: "admin", role: "admin" },
      superadmin: { password: "superadmin", role: "superadmin" },
    };

    const user = users[decoded.username];

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }
    
    return res.status(200).json({
      success: true,
      username: decoded.username,
      role: user.role,
    });
  } catch (error) {
    console.error("Verification failed:", error.message);
    return next(createHttpError(401, "Unauthorized"));
  }
};


export { login, getUserData, verifyUser };