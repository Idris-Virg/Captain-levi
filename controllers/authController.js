exports.login = async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    let role = "user";

 if(user.email.startsWith('admin@')) {
        role = 'admin';
} else if(user.email.startsWith('superadmin@')) { 
    role = 'superadmin';   
}

    // Mock user object
    const user = {
        email,
        role
    };

    return res.json({
        success: true,
        message: "Login successful",
        user
    });
};

exports.logout = (req, res) => {
    return res.json({
        success: true,
        message: "Logged out successfully"
    });
};

exports.getProfile = (req, res) => {
    if (!req.body.user) {
        return res.status(401).json({ error: "Not logged in" });
    }

    return res.json({
        success: true,
        profile: req.body.user,
        assignedRole: req.userRole
    });
};

exports.checkRole = (req, res) => {
    return res.json({
        message: "Role verified",
        role: req.userRole
    });
};