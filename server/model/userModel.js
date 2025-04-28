import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: (true, "Please Enter a Password"),
        trim: true
    },
    role: {
        type: String,
        required: true,
        enum: ["admin", "superadmin", "user"]
    },
}, {timestamps: true});



const user = mongoose.model("user", adminSchema);
export default user;
