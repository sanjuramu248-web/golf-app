"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const apiError_1 = require("../utils/apiError");
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof apiError_1.ApiError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors,
        });
        return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
};
exports.errorHandler = errorHandler;
