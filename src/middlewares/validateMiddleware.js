import { registerSchema } from '../schemas/authSchema.js'

export function validateMiddleware(req, res, next) {
    // 做一些檢查...
    try {
        registerSchema.parse(req.body)
        next();
    } catch (error) {
        return res.status(400).json({
            error: 'INVALID_INPUT',
            message: 'EMAIL或密碼格式不正確'
        });
    }
}