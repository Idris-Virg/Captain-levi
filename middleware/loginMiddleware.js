export const login = async (req, res) => {
    const { email, password } = req.body;

    //Basic validation
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    //Determine role based on email
    let role = 'user';
    if (email.startsWith('admin@')) {
        role = 'admin';
    } else if (email.startsWith('user@')) {
        role = 'user';
    } else if (email.startsWith('superadmin@')) {
        role = 'superadmin';
    }
    //In real app, verify password and fetch user details from DB 
    //Mock user object

    //Return user info with role
    res.json({
        success: true,
        user: {
            email:email,
            role:role
        }
    });
}
export default login;


