
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:4000';
const BACKEND_GET_USER_BY_EMAIL_URL = `${USER_SERVICE_URL}/users?email=`;
const BACKEND_REGISTER_URL = `${USER_SERVICE_URL}/users`;
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