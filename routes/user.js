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
      const expires_in = 60 * 60 * 1000
      const exp = Date.now() + expires_in
      const token = jwt.sign({ email, exp }, secretKey)
      res.status(200).json({ token_type: "Bearer", token, expires_in })
    })
});


// This function takes the authorisation header and parameter email and runs a set of checks to see if the email encoded with the JWT matches the paramater email from the user.
// returns false if emails do not match
// returns true if emails match
const compareTokenEmail = (authHeader, paramEmail) => {

  // set variables to be utilised in checks
  let token = null;
  let decoded = null;
  let decodedEmail = null;

  // check for blank authHeader scenario
  if (!authHeader) {
    return false;
  }
  else if (authHeader && authHeader.split(" ").length === 2) {

    // set variables extracted from auth header to use in checks below
    token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, secretKey);
    decodedEmail = decoded.email;

    if (decodedEmail !== paramEmail) {
      return false;
    }
    if (decodedEmail === paramEmail) {
      return true;
    }
  }
};

// A modified authorisation check that does not throw an error if there is no value brought in by the authorization header. This allows the function to continue through to the email checks without being interupted.
const jwtCheck = (req, res, next) => {

  // associating variables for use in JWT checks
  const authorization = req.headers.authorization;
  let token = null;

  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1]
  }
  else {
    next()
    return
  }

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
}

// GET email profile 
router.get("/:email/profile", jwtCheck, function (req, res, next) {

  // capturing email from the users parameter input
  const authorization = req.headers.authorization;
  const paramEmail = req.params.email;

  // run a check against the JWT email vs URL parameter email address. store result for boolean check in order to decide which profile query to execute (auth vs public).
  const checkSameEmail = compareTokenEmail(authorization, paramEmail);

  // query for searching db for matching email address in user table
  const queryUsers = req.db.from("users").select("*").where("email", "=", paramEmail)

  // two seperate queries that will display the public and authorised views as required
  const publicProfileQuery = req.db.from("users").select('email', 'firstName', 'lastName').where('email', paramEmail)

  const authedProfileQuery = req.db.from("users").select('email', 'firstName', 'lastName', 'dob', 'address').where('email', paramEmail)

  queryUsers.then((users) => {

    // check to see if user email exists within db and throw error if none.
    if (users.length === 0) {
      res.status(401).json({ error: true, message: "User not found" })
      return
    }

    // checkwhether the email in the JWT and the email parameter entered match. this checks for a mismatch and if so, only displays the public profile information.
    else if (checkSameEmail == false) {
      publicProfileQuery.then((rows) => {
        res.status(200).json(rows)
      })
    }

    // checks to see if JWT email and parameter email match ensuring correct email with matching JWT email is making request. This confirms that the full authorised profile should be displayed. 
    else if (checkSameEmail == true) {
      authedProfileQuery.then((rows) => {
        res.status(200).json(rows)
      })
        .catch((err) => {
          res.status(400).json({ "Error": true, "Message": "Error executing MySQL query" })
        })
    }

  })
});

// authorization function that validates the JWT being utilised in the request. This forms the basis of the JWT error handling in order to produce the required codes and messages as per swagger docs.
const authorize = (req, res, next) => {

  const authorization = req.headers.authorization;
  let token = null;

  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1]
  }
  else {
    res.status(401).json({ error: true, message: "Authorization header ('Bearer token') not found" })
    return
  }

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
}


// may need to add a check for empty/undefined values...
const checkBodyParams = (firstName, lastName, address) => {

  // set initial value to false and only change if one of the checks below triggers a change to true.
  var checkResult = false;

  console.log("firstname type: " + typeof firstname)
  // checking input type of req.body values to manage error handling codes and message
  if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof address !== 'string') {
    checkResult = true;
  }
  return checkResult;

}

// regexp dob checker that is used to assess correct dob format input and manage error handling codes and message
const checkDobFormat = (date) => {
  const regexp = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  var checkDob = regexp.test(date);
  if (checkDob = false) {
    return true;
  }
}

// This function takes a date and checks if it is in the future or in the past as compared to the current date. It constructs the current date in a format that can be compared to the input date. 
const checkDobTime = (date) => {
  const dateNow = new Date();
  const currYear = dateNow.getFullYear();
  const currMth = dateNow.getMonth() + 1;
  const currDay = dateNow.getDate();
  const currentDate = (currYear + "-" + currMth + "-" + currDay)

  // boolean return used to assess correct dob format input and manage error handling codes and message
  if (currentDate < date) {
    return true
  }
}

router.put("/:email/profile", authorize, function (req, res, next) {

  // initialise variables from request body and parameters.
  const bodyData = req.body;
  const authorization = req.headers.authorization;
  const paramEmail = req.params.email;
  const firstName = bodyData.firstName;
  const lastName = bodyData.lastName;
  const address = bodyData.address;
  const dob = bodyData.dob;

  // used in the construction of a successful update request. 
  const updateValues = {
    "firstName": firstName,
    "lastName": lastName,
    "dob": dob,
    "address": address
  };

  // used to return the necessary values to the user as per swagger docs
  const returnValues = {
    "email": paramEmail,
    "firstName": firstName,
    "lastName": lastName,
    "dob": dob,
    "address": address
  }

  // These are a set of tests that capture the boolean response. This response is then used to produce the required error messages or if passed, allow the function to continue to the update clause.
  const checkSameEmail = compareTokenEmail(authorization, paramEmail);
  const checkBodyTypes = checkBodyParams(firstName, lastName, address);
  const checkDob = checkDobFormat(dob);
  const checkDobDate = checkDobTime(dob);
  const queryUsers = req.db.from("users").select("*").where("email", "=", paramEmail)

  queryUsers.then((users) => {

    // check to see if user email exists within db and throw error if none.
    if (users.length === 0 || !checkSameEmail) {
      res.status(403).json({ error: true, message: "Forbidden" })
      return
    }
    else if (checkBodyTypes) {
      res.status(400).json({ error: true, message: "Request body invalid, firstName, lastName and address must be strings only." })
    }
    else if (checkDob) {
      res.status(400).json({ error: true, message: "Invalid input: dob must be a real date in format YYYY-MM-DD." })
    }
    else if (checkDobDate) {
      res.status(400).json({ error: true, message: "Invalid input: dob must be a date in the past." })
    }
    // run the update request to the validated user in the db then return the update values back to the user
    else {
      req.db.from("users")
        .where('email', paramEmail)
        .update(updateValues)
        .then(_ => {
          res.status(200).json(returnValues);
        })
        .catch((err) => {
          res.status(500).json({ error: true, message: "Database error - no updates have been made." })
        })
    }
  })

});

module.exports = router;
