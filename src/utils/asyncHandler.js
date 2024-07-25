const asyncHandler = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            console.log(error.message)
            return res
                .status(error.code || 500)
                .json({
                    success: false,
                    message: error.message || 'Server Error'
                })
        }
    }
}

export default asyncHandler;