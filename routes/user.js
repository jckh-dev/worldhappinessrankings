var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const saltRounds = 10;


/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

router.post("/register", function (req, res, next) {
  //1. retrieve  email and password from req.body
  const email = req.body.email
  const password = req.body.password
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required"
    })
    return
  }
  //2. determine if the user already exists in the tables
  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  queryUsers
    //2.2 if user does exist, return error res  ponse
    .then((users) => {
      if (users.length > 0) {
        res.status(401).json({ error: true, message: "User already exists" }).
          return;
      }
      //2.1 if user does not exist, insert into table
      const hash = bcrypt.hashSync(password, saltRounds)
      return req.db.from("users").insert({ email, hash })
    })
    .then(() => {
      res.status(201).json({ success: true, message: "User Created" })
    })
})

router.post("/login", function (req, res, next) {
  const email = req.body.email
  const password = req.body.password

  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed"
    })
    return
  }
  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  queryUsers.then((users) => {
    if (users.length === 0) {
      res.status(401).json({ error: true, message: "User Does not Exist" }).
        return
    }
    //comapare pw hashes
    const user = users[0]
    return bcrypt.compare(password, user.hash)
  })
    .then((match) => {
      if (!match) {
        res.status(401).json({ error: true, message: "Unauthorized" }).
          return
      }
      const secretKey = "secret key"
      const expires_in = 60 * 60 * 24
      const exp = Date.now() + expires_in * 1000
      const token = jwt.sign({ email, exp }, secretKey)
      res.json({ token_type: "Bearer", token, expires_in })
    })
})


module.exports = router;
