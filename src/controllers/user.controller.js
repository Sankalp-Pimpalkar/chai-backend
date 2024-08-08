import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/user.model.js';
import uploadOnCloudinary from '../utils/cloudinary.js';
import ApiResponse from '../utils/ApiResponse.js';
import fs from "fs";
import jwt from "jsonwebtoken"

const cookieOptions = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accesstoken = user.generateAccessToken()
        const refreshtoken = user.generateRefreshToken()

        user.refreshToken = refreshtoken;
        await user.save({ validateBeforeSave: false });

        return { accesstoken, refreshtoken }

    } catch (error) {
        throw new ApiError(
            500,
            "Tokens generation failed!"
        )
    }
}

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

const loginUser = asyncHandler(async (req, res) => {
    // Take email or username and password from user
    // Search for user availability in db
    // If user not found throw error
    // IF user found set accesstoken and pass it to user through cookies
    // Give success message with user details except password and refreshToken
    const { email, username, password } = req.body;

    if (!(email || username)) {
        throw new ApiError(
            400,
            "Username or Email is required!"
        )
    }

    const userInDB = await User.findOne(
        { $or: [{ email }, { username }] }
    )

    if (!userInDB) {
        throw new ApiError(
            404,
            "User not found"
        )
    }

    const isCorrectPassword = await userInDB.isPasswordCorrect(password)

    if (!isCorrectPassword) {
        throw new ApiError(
            401,
            "Password Incorrect!"
        )
    }

    const { accesstoken, refreshtoken } = await generateAccessAndRefreshTokens(userInDB._id)

    const loggedInUser = await User.findById(userInDB._id).select('-password -refreshToken')

    return res
        .status(200)
        .cookie("accesstoken", accesstoken, cookieOptions)
        .cookie("refreshtoken", refreshtoken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accesstoken, refreshtoken
                },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    return res
        .status(200)
        .clearCookie("accesstoken", cookieOptions)
        .clearCookie("refreshtoken", cookieOptions)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged Out!"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshtoken || req.body.refreshtoken

    if (!incomingRefreshToken) {
        throw new ApiError(
            401,
            "Unauthorized Request"
        )
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken._id)

        if (!user) {
            throw new ApiError(
                401,
                "Invalid refreshToken"
            )
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(
                401,
                "refreshToken mismatched"
            )
        }

        const { accesstoken, refreshtoken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accesstoken", accesstoken, cookieOptions)
            .cookie("refreshtoken", refreshtoken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    {
                        accesstoken,
                        refreshtoken
                    },
                    "Access token and refresh token generated successfully"
                )
            )
    } catch (error) {
        throw new ApiError(
            400,
            error?.message || "Invalid refreshtoken"
        )
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}