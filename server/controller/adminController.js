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

        const isUserPresent = await User.findOne({ username });
        if (!isUserPresent) {
            return next(createHttpError(401, "Invalid Credentials"));
        }


        const isMatch = await bcrypt.compare(password, isUserPresent.password);
        if (!isMatch) {
            return next(createHttpError(401, "Invalid Credentials"));
        }

        const token = jwt.sign(
             { _id: isUserPresent._id, 
               role: isUserPresent.role
             },
            Config.accessTokenSecret,
            { expiresIn: '1d' }
        );



        res.status(200).json({
            success: true,
            message: "User  logged in successfully",
            token,
            user: {
                _id: isUserPresent._id,
                username: isUserPresent.username,
                role: isUserPresent.role
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