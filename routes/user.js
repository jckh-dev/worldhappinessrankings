const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const saltRounds = 10;
const secretKey = "secret key";

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

router.post("/register", function (req, res, next) {

  //retrieve email and password from req.body
  const email = req.body.email
  const password = req.body.password

  // check to ensure that both values are defined
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required"
    })
    return
  }

  //  determine if the user already exists in the tables
  const queryUsers = req.db.from("users").select("*").where("email", "=", email)

  queryUsers
    // if user does exist, return error response
    .then((users) => {
      if (users.length > 0) {
        res.status(409).json({ error: true, message: "User already exists" }).
          return;
      }
      //2.1 if user does not exist, insert into table
      const hash = bcrypt.hashSync(password, saltRounds)
      return req.db.from("users").insert({ email, hash })
    })
    .then(() => {
      res.status(201).json({ success: true, message: "User created" })
    })
})

router.post("/login", function (req, res, next) {

  const email = req.body.email
  const password = req.body.password

  // check to ensure that both values are defined
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required"
    })
    return
  }
  // check to see if 
  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  queryUsers.then((users) => {

    // check if email currently exists in db, if not: throw error to inform user
    if (users.length === 0) {
      res.status(401).json({ error: true, message: "Incorrect email or password" }).
        return
    }

    // if there is a matching email in db, comapare pw and user pw hash
    const user = users[0]
    return bcrypt.compare(password, user.hash)
  })
    // if pw do not match, throw error to inform user
    .then((match) => {
      if (!match) {
        res.status(401).json({ error: true, message: "Incorrect email or password" }).
          return
      }
      // if pw matches, create and associate jwt and its expirey to user email
      const secretKey = "secret key"
      const expires_in = 60 * 60 * 24
      const exp = Date.now() + expires_in * 1000
      const token = jwt.sign({ email, exp }, secretKey)
      res.status(200).json({ token_type: "Bearer", token, expires_in })
    })
});

const authorize = (req, res, next) => {

  const authorization = req.headers.authorization;
  let token = null;


  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1]
  }
  //  

  // verify JWT Token
  try {
    const decoded = jwt.verify(token, secretKey)

    if (decoded.exp < Date.now()) {
      res.status(401).json({ error: true, message: "JWT token has expired" })
      return
    }

    // permit user to advance
    next()
  } catch (e) {
    res.status(401).json({ error: true, message: "Invalid JWT token" })
  }
};

// get email profile 
router.get("/:email/profile", authorize, function (req, res, next) {

  const authorization = req.headers.authorization;

  // capturing email from the users parameter input
  const email = req.params.email;
    

  const decodedEmail = authorize.decoded.email;

  // query for searching db for matching email address in user table
  const queryUsers = req.db.from("users").select("*").where("email", "=", email)

  const publicProfileQuery = req.db.from("users").select('email', 'firstName', 'lastName').where('email', email)

  const authedProfileQuery = req.db.from("users").select('email', 'firstName', 'lastName', 'dob', 'address').where('email', email)

  queryUsers.then((users) => {

    // check to see if user email exists within db and throw error if none.
    if (useriles.length === 0) {
      res.status(401).json({ error: true, message: "User not found" }).
        return
    }

    // check the token authorisation state and whether the email in the JWT and the email parameter entered match. If there is no token or the emails do not match, return the basic public profile information
    else if (authorize.token === null || decodedEmail != email) {
      publicProfileQuery.then((rows) => {
        res.status(200).json(rows)
      })
    }

    // if there is a JWT present and the JWT email and parameter email match, this confirms user authentication. if so, return the full set of user details 
    else if (authorize.token != null && decodedEmail === email) {
      authedProfileQuery.then((rows) => {
        res.status(200).json(rows)
      })
        .catch((err) => {
          res.status(400).json({ "Error": true, "Message": "Error executing MySQL query" })
        })
    }
  })
});

module.exports = router;
