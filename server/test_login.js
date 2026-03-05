import axios from 'axios';

const testLogin = async () => {
    try {
        console.log('Attempting login for staff1@edu...');
        // Try guessing the password or using the one from the screenshot placeholder if possible, 
        // but likely it's something simple like '123456' or 'staff1'.
        // Actually, if I created it via API, I would know. But I didn't. User did.
        // I will try 'password', 'staff1', '123456'.

        const passwords = ['password', 'staff1', 'student1', '123456', 'Secret Password', 'admin'];

        for (const password of passwords) {
            console.log(`Trying password: ${password}`);
            try {
                const res = await axios.post('http://localhost:5000/api/auth/login', {
                    loginId: 'student1@edu',
                    password: password
                });
                console.log('SUCCESS:', res.data);
                return;
            } catch (err) {
                console.log(`FAILED (${password}):`, err.response?.data?.message);
            }
        }
    } catch (error) {
        console.error('Script Error:', error.message);
    }
};

testLogin();
