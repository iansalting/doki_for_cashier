import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from "./config.js";


dotenv.config(); 

const dbConnection = async () => {
  try {
    const conn = await mongoose.connect(config.databaseURI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default dbConnection;
