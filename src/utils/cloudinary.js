import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_NAME,
    api_secret: process.env.CLOUDINARY_SECRET
})

async function uploadOnClpudinary(localFilePath) {
    try {
        if (!localFilePath) {
            console.error("No local file path provided.");
            return;
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        console.log(`File "${localFilePath}" uploaded successfully to Cloudinary. Image URL: ${response.url}`);

        fs.unlinkSync(localFilePath);

        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
}

export default uploadOnClpudinary;