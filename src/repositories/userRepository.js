
// 服務間通訊一律經 api-gateway 的 /internal/* 路由轉發，不直連 user-service。
// x-internal-request header 由 Gateway 的 internalAuthMiddleware 依來源 IP 注入，
// 本服務不會（也不該）自己塞這個 header——避免誤導成「呼叫端可以自稱內部請求」。
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';
const BACKEND_GET_USER_BY_EMAIL_URL = `${GATEWAY_URL}/internal/users?email=`;
const BACKEND_REGISTER_URL = `${GATEWAY_URL}/internal/users`;
export const userRepository = {
    async findByEmail(email) {
        try {
            const response = await fetch(BACKEND_GET_USER_BY_EMAIL_URL + email, {
                method: 'GET'
            });
            const result = await response.json();
            if (response.ok) {
                return result;
            } else if (response.status === 404) {
                return null;
            } else {
                throw new Error(`user-service 回傳錯誤：${response.status}`);
            }
        } catch (error) {
            throw error;
        }
    },
    async save(newUser) {
        try {
            const requestBody = {
                id: newUser.id,
                email: newUser.email,
                password: newUser.password
            };
            const response = await fetch(BACKEND_REGISTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            const result = await response.json();
            if (response.ok) {
                return result;
            } else {
                throw new Error(`user-service 回傳錯誤：${response.status}`);
            }
        } catch (error) {
            throw error;
        }

    }

}