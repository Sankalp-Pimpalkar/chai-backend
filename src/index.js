import dotenv from "dotenv";
dotenv.config({ path: './env' })
import connectDB from "./db/index.js";
import { app } from "./app.js";


connectDB()
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Server running on port http://localhost:${process.env.PORT}`)
        })
    })
    .catch(() => {
        console.log("Mongodb connection error.Server not started.")
    })