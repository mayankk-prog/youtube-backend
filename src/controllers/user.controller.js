import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiErrors.js";
import { user } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;
  console.log("email:", email);

  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Please provide all fields");
  }

  const existeduser= user.findOne({
    $or: [ {username} , {password}]
  })
  if (existeduser) {
    throw new ApiError(409, "user with this email or username is already exist")
  }

  const avatarLocalPath= req.files?avatar[0]?.path;
  const coverImageLocalPath= req.files?.coverImage[0?.path]

  if(!avatarLocalPath){
    throw new ApiError(400, "avatar file is necessary")
  }

  const avatar= await uploadOnCloudinary(avatarLocalPath)
  const coverImage= await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar){
    throw new ApiError(400, "avatar is required")
  }

  const user= await user.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser= await user.findById(user._id).select(" -password -refreshToken")

  if(!createdUser){
    throw new ApiError(500, "something went wrong from our side, please refresh")
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "user registered successfully")
  )



});
export { registerUser };
