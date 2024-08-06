import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/user.model.js';
import uploadOnCloudinary from '../utils/cloudinary.js';
import ApiResponse from '../utils/ApiResponse.js';
import fs from "fs";

const registerUser = asyncHandler(async (req, res) => {

    const { fullName, email, username, password } = req.body;
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path

    if (
        [fullName, email, username, password]
            .some((field) => field?.trim() === '')
    ) {
        avatarLocalPath && fs.unlinkSync(avatarLocalPath)
        coverImageLocalPath && fs.unlinkSync(coverImageLocalPath)
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existedUser) {
        avatarLocalPath && fs.unlinkSync(avatarLocalPath)
        coverImageLocalPath && fs.unlinkSync(coverImageLocalPath)
        throw new ApiError(409, "User with the same email or username already exists");
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    let coverImage;

    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath)
    }

    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar image to cloudinary");
    }

    const user = await User.create({
        fullName,
        email,
        username,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const isUserCreated = await User.findById(user._id).select('-password -refreshToken')

    if (!isUserCreated) {
        throw new ApiError(500, "Failed to create user");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                isUserCreated,
                "User registered successfully"
            ))
})

export {
    registerUser
}