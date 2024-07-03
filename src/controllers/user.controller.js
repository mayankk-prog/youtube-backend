import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    console.log(`Fetching user with ID: ${userId}`);
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    console.log(`Generating access token for user: ${userId}`);
    const accessToken = user.generateAccessToken();

    console.log(`Generating refresh token for user: ${userId}`);
    const refreshToken = user.generateRefreshToken();

    console.log(`Saving refresh token for user: ${userId}`);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    console.log(`Tokens generated successfully for user: ${userId}`);
    return { accessToken, refreshToken };
  } catch (error) {
    console.error(`Error occurred for user: ${userId}`, error);
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};


const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;
  console.log("email:", email);

  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Please provide all fields");
  }

  // const existeduser= await User.findOne({
  //   $or: [ {username} , {password}]
  // })
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(
      409,
      "user with this email or username is already exist"
    );
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  // const coverImageLocalPath = req.files?.coverImage[0?.path];
  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0 ){
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is necessary");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar is required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    " -password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(
      500,
      "something went wrong from our side, please refresh"
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered successfully"));
});

const loginUser= asyncHandler(async (req, res) => {
  const {email, username, password} = req.body

  if (!(username || email)){
    throw new ApiError(400, "username or email is required")
  }

  const user= await User.findOne({
    $or: [{username}, {email}]
  })

  if (!user){
    throw new ApiError(400, "user doesnt exist")
  }

  const isPasswordValid= await user.isPasswordCorrect(password)
  
  if(!isPasswordValid){
    throw new ApiError(401, "invalid user credentials")
  }

   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
     user._id
   );

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {httpOnly: true, secure: true}

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200, {
        user: loggedInUser, accessToken, refreshToken
  },"user logged in successfully")
  )

});

const logoutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,{
      $set:{ refreshToken: undefined}
    },{
      new: true
    }
  )
  const options = {httpOnly: true, secure: true}
  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "user logged out"))
})

export { registerUser,
loginUser,
logoutUser };
