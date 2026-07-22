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
    const stmt = db.prepare(`SELECT * FROM Users WHERE Id = ?`);
    return stmt.get(id);
}

const checkEmailExists = (email) => {
    const stmt = db.prepare(`SELECT COUNT(*) FROM Users WHERE Email = ?`);
    return stmt.get(email) > 0 ? true : false ;
};

const registerUser = (
    username, password, role, firstName, lastName, email,
    phoneCode, phone, dateOfBirth) => {
    
    const registerTxn = db.transaction(() => {
        const stmt = db.prepare('INSERT INTO Users (Username, PasswordHash, Role, FirstName, LastName, Email, PhoneCode, Phone, DateOfBirth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
        const info = stmt.run(username, passwordHash, role, firstName, lastName, email, phoneCode, phone, dateOfBirth);
        const userId = info.lastInsertRowid;
        const hash = createEmailHash();

        db.prepare('INSERT INTO EmaiVerifications (UserId,CryptoHash) VALUES (?,?)').run(userId,hash);
        sendVerificationEmail(userId,role,hash,email);

        return userId;
    });
    return registerTxn();
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

const sendVerificationEmail = (userId,role,hash,userEmail) => {
    const url = `http://${role.toLowerCase()}.shahzan.com/verify-email?id=${userId}&hash=${hash}`;
    const message = `
    ###############################################
    Farm Connect
    Verify your email by going to the link below

    ${url}

    Enjoy!!
    ###############################################
    `;

    sendEmail(userEmail,message);

};

const sendEmail = (emailId,message) => {
    console.log(message)
};

const createEmailHash = () => {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex'); // 64-char hex string
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return tokenHash;
}

const verifyEmail = (id,hash) => {
    const txn = db.transaction(() => {
        const row = db.prepare('SELECT * FROM EmaiVerifications WHERE UserId = ?').get(id);
        if(row.CryptoHash === hash) {
            console.log("matching")
            db.prepare("DELETE FROM EmaiVerifications WHERE Id = ?").run(row.Id);
            console.log(4)
            db.prepare("UPDATE Users SET IsEmailVerified = 1  WHERE Id = ?").run(id);
            console.log(5)
        } else {
            throw new Error("Hash_Dont_Match")
        }
    });

    txn();
}

module.exports = {
    getUserByUsername,
    getUserByUserId,
    registerUser,
    createRandomUserName,
    checkEmailExists,
    login,
    verifyEmail
};

