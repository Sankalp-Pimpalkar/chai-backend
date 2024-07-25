import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const mongooseResponse = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)

        console.log(`MONGODB connection established!! DB HOST:${mongooseResponse.connection.host}`)

    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB;