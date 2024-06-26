import {asyncHandler} from "../utils/asyncHandler.js"

const registerUser= asyncHandler ( async(req, res) => {
    res.status(206).json ({
        message: "ok"
    })
})

export {registerUser}   