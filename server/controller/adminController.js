import createHttpError from "http-errors";
import User from "../model/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Config from '../config/config.js';

// Register new admin
const register = async (req, res, next) => {
    const { username, password, role } = req.body;


    if (!username || !password || !role) {
        return next(createHttpError(400, "All fields are required"));
    };

    if (role === "superadmin") {
        const existingSuperadmin = await User.findOne({ role: "superadmin" });
        if(existingSuperadmin) {
            return res.status(403).json({message: 'A superadmin account already exists.'})
        }
    };

    try {
        const existingAdmin = await User.findOne({ username });
        if (existingAdmin) {
            return next(createHttpError(400, "Admin already exists"));
        };

        const userRole = role || 'admin';


        const hashedPassword = await bcrypt.hash(password, 10);


        const user = new User({ 
            username, 
            password: hashedPassword, 
            role: userRole,
        });
        await user.save();

        res.status(201).json({
            success: true,
            message: "Registered successfully",
            data: user,
        });
    } catch (error) {
        next(error);
    };
};


const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return next(createHttpError(400, "All fields are required"));
        }

        const user = await User.findOne({ username });
        if (!user) {
            return next(createHttpError(401, "Invalid credentials"));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next(createHttpError(401, "Invalid credentials"));
        }

        const token = jwt.sign(
            { _id: user._id, role: user.role },
            Config.accessTokenSecret,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            token,
            user: {
                _id: user._id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        next(error);
    }
};


const getUserData = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return next(createHttpError(404, "User  not found"));
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};





export { register, login, getUserData };