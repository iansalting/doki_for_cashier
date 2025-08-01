import dotenv from "dotenv";
dotenv.config();

const config = Object.freeze({
  port: process.env.PORT || 8000,
  //databaseURI: process.env.MONGO_URI,
  databaseURI: process.env.MONGO_CLOUD,
  nodeEnv: process.env.NODE_ENV || "development",
  accessTokenSecret: process.env.JWT_SECRET,
  sharedPath: process.env.SHARED_UPLOAD_PATH || "/",
  baseUrl: process.env.BASE_URL
});

export default config;
