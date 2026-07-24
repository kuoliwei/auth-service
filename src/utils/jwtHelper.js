import jwt from 'jsonwebtoken';

export function generateToken(userId) {
    const payload = { id: userId };
    const secret = process.env.JWT_SECRET;
    const options = { expiresIn: '7d' };

    const token = jwt.sign(payload, secret, options);
    console.log(`🔑 [jwtHelper] 為使用者 ${userId} 簽發新 token（效期 7 天）`);

    return token;
}