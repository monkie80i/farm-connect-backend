const db = require('../db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;


const createRandomUserName = (firstName, lastName) => {
    const randomNum = Math.floor(Math.random() * 1000);
    return `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomNum}`;
}

const getUserByUsername = (username) => {
    const stmt = db.prepare('SELECT * FROM Users WHERE Username = ?');
    return stmt.get(username);
};

const getUserByUserId = (id) => {
    const stmt = db.prepare(`SELECT Id, Username,FirstName,LastName, Email,
        PhoneCode,Phone,DateOfBirth,Role,IsEmailVerified,
        IsPhoneVerified,IsVerificationFilled,IsAdminVerified,
        IsActive,IsAdmin,IsBanned,CreatedDate,UpdateDate
        FROM Users WHERE Id = ? AND IsActive IS TRUE`);
    return stmt.get(id);
   
}

const checkEmailExists = (email) => {
    const stmt = db.prepare(`SELECT COUNT(*) FROM Users WHERE Email = ?`);
    return stmt.get(email) > 0 ? true : false ;
};

const registerUser = (
    username, password, role, firstName, lastName, email,
    phoneCode, phone, dateOfBirth) => {
    const stmt = db.prepare('INSERT INTO Users (Username, PasswordHash, Role, FirstName, LastName, Email, PhoneCode, Phone, DateOfBirth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
    const info = stmt.run(username, passwordHash, role, firstName, lastName, email, phoneCode, phone, dateOfBirth);
    return info.lastInsertRowid;
}


const login = (email,password) => {
    const user = db.prepare(`SELECT * FROM Users WHERE Email = ?`).get(email);
    if(user) {
        const matches = bcrypt.compare(password,user.PasswordHash);
        if(!matches) {
            return null;
        }
        return user;
    }

    return null;


};

module.exports = {
    getUserByUsername,
    getUserByUserId,
    registerUser,
    createRandomUserName,
    checkEmailExists,
    login,
};

