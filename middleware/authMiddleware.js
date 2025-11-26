import { response } from "express";

//authMiddleware.js
export const authMiddleware =  (req, res, next) => {
//Get user info from request
const user = req.user || req.body.user;

if (!user || !user.email) {
    return res.status(401).json({ 
        error:'Unauthorized - Please log in to access this resource'
    });
}

//Assign role based on email prefix
let role = 'user';// default role

if(user.email.startsWith('admin@')) {
    role = 'admin';
} else if(user.email.startsWith('user@')) {
    role = 'user';
} else if(user.email.startsWith('superadmin@')) { 
    role = 'superadmin';   
}

//Attach role to request for use in routes
req.userRole = role;

//Example: Check if user has required role for this route
if (response.body.role == 'user'){
    if (role === 'user'){
      // Allow access for users
        next();
    } else if (role === 'admin')
      // Allow access for admins
        next();
    else {
        return res.status(403).json({
            error: 'Forbidden - You do not have permission to access this resource'
        });    
    }
}};


export default authMiddleware;