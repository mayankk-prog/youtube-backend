import { ApiError } from "../utils/apiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Get the token from cookies or Authorization header
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    // Log the token for debugging
    console.log("Token:", token);

    if (!token) {
      throw new ApiError(401, "Unauthorized request: No token provided");
    }

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Find the user by ID and exclude password and refreshToken fields
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Unauthorized request: Invalid access token");
    }

    // Attach the user to the request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in verifyJWT middleware:", error);
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

export default verifyJWT;
 