

function authenticateUser (req, res, next)  {
    const authHeader = req.headers['authorization'];

    if(authHeader === 'MySecretToken') {
        return next();
    }else {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

module.exports = authenticateUser;