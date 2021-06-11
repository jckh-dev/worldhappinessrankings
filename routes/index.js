const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
// helper functions


// These three functions takes the user input for the year/country/limit paramater and checks to see if the input is of a valid format for that input type.
function checkYearFormat(param) {
  var checkYear = !!(+param == param && param.length === 4 && param.trim() == param);
  // Returns true if format is valid
  // Returns false if format is invalid
  return checkYear;
};

function checkCountryFormat(param) {
  const regexp = /\d/g;
  var checkCountry = regexp.test(param);
  // returns true if a number is detected (invalid)
  // returns false if no number is detected (valid)
  return checkCountry
};

function checkLimitFormat(param) {
  const regexp = /^[1-9]\d*$/;
  var checkLimit = regexp.test(param);
  // returns true if format is valid
  // returns false if non-integer number is detected (invalid)
  return checkLimit
}


// These two functions takes an array of query parameters and destructures the values into the valid keys for that query and all remaining keys. It then checks to see if there are any 'remaining'.
// Returns true if there are any extra invalid parameter keys.
// Returns false if there are no invalid parameters. 
function checkInvalidRankParams(params) {

  const { year, country, ...invalidRemaining } = params;
  var invalidKeys = Object.keys(invalidRemaining);

  console.log(invalidKeys);

  if (invalidKeys.length > 0) {
    return true;
  } else {
    return false;
  }
}

function checkInvalidFactParams(params) {

  const { limit, country, ...invalidRemaining } = params;
  var invalidKeys = Object.keys(invalidRemaining);

  if (invalidKeys.length > 0) {
    return true;
  } else {
    return false;
  }
}

// function is a query builder for the rankings endpoint knex db query. Takes the optional year and country values, checks to see if they are defined or undefined, and associates the required query structure accordingly.
const withOptionalRankParams = function (queryBuilder, yearVal, countryVal) {

  if (yearVal && countryVal) {
    queryBuilder.where('year', yearVal).andWhere('country', countryVal);
  }
  else if (yearVal && !countryVal) {
    queryBuilder.where('year', yearVal);
  }
  else if (!yearVal && countryVal) {
    queryBuilder.where('country', countryVal)
  }

};

// function is a query builder for the factors endpoint knex db query. Takes the optional year and limit values, checks to see if they are defined or undefined, and associates the required query structure accordingly.
const withOptionalFactorParams = function (queryBuilder, params) {

  let country = params.country;
  let limit = params.limit;

  if (country && limit) {
    queryBuilder.where('country', country).limit(limit)
  }
  if (country && !limit) {
    queryBuilder.where('country', country)
  }
  if (!country && limit) {
    queryBuilder.limit(limit)
  }
};


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index');
});


// GET rankings Page
router.get("/rankings", function (req, res, next) {

  const optionalRankParams = req.query;
  const yearVal = req.query.year;
  const countryVal = req.query.country;

  // running variable parameters through suitable checks, returning boolean values
  var invalidParams = checkInvalidRankParams(optionalRankParams);
  var yearFormat = checkYearFormat(yearVal);
  var countryFormat = checkCountryFormat(countryVal);

  // test boolean values of parameter check results to sanitise DB query values. if a test is true, throw status error with suitable message. if 
  if (invalidParams) {
    res.status(400).json({ "Error": true, "Message": "Invalid Query Parameters. Only year and country are permitted." })
    return
  }
  else if (yearVal && !yearFormat) {
    res.status(400).json({ "Error": true, "Message": "Invalid year format. Format must be yyyy." })
    return
  }
  else if (countryFormat) {
    res.status(400).json({ "Error": true, "Message": "Country query parameter cannot contain numbers." })
    return
  }
  // if all checks return false, continue with DB query construction
  else {
    req.db.from('rankings')
      .select('rank', 'country', 'score', 'year')
      // The query builder will take both optional params in but filter out any undefined values to produce final db query 'where' statements.
      .modify(withOptionalRankParams, yearVal, countryVal)
      .orderBy('year', 'desc')
      // display successful results. will return empty array if no results.
      .then((rows) => {
        res.status(200).json(rows)
      })
      .catch((err) => {
        console.log(err);
        res.status(400).json({ "Error": true, "Message": "Error executing MySQL query" })
      })
  }
});


// GET countries route
router.get("/countries", function (req, res, next) {

  // capture any additional query parameters submitted with the GET request
  const queryParams = req.query;

  // if there are any parameters in the request, throw error with suitable message.
  if (queryParams.length > 0) {
    res.status(400).json({ "Error": true, "Message": "Invalid Query Parameters. Query parameters are not permitted." })
    return
  }
  else {
    req.db.from('rankings')
      .select('country')
      .orderBy('country', 'ASC')
      // filter out multiple returned results
      .distinct()
      // display successful results. will return empty array if no results.
      .then((rows) => {
        res.status(200).json(rows)
      })
      .catch((err) => {
        console.log(err);
        res.status(400).json({ "Error": true, "Message": err + "Error executing MySQL query." })
      })
  }
})


// function to test for user authorization status when attempting to access the factors end point.
const authorize = (req, res, next) => {

  const authorization = req.headers.authorization;
  let token = null;
  const secretKey = "secret key";

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


// factors page
router.get("/factors/:year", authorize, function (req, res) {
  // catch the 404 error for navigating straight to factors with a year in the url

  const optionalFactParams = req.query;
  const limit = req.query.limit;
  const country = req.query.country;
  const year = req.params.year;

  var validYear = checkYearFormat(year);
  var invalidParams = checkInvalidFactParams(optionalFactParams);
  var validLimit = checkLimitFormat(limit);
  var validCountry = checkCountryFormat(country);

  if (!validYear) {
    res.status(400).json({ "Error": true, "Message": "Invalid year format. Format must be yyyy" });
  }
  else if (invalidParams) {
    res.status(400).json({ "Error": true, "Message": "Invalid Query Parameters. Only limit and country are permitted." })
    return
  }
  else if (limit && !validLimit) {
    res.status(400).json({ "Error": true, "Message": "Invalid limit query. Limit must be a positive number." })
  }
  else if (country && validCountry) {
    res.status(400).json({ "Error": true, "Message": "Invalid country format. Country query parameter cannot contain numbers." })
  }
  else {
    req.db.from('rankings').select('*').where('year', year)
      .modify(withOptionalFactorParams, optionalFactParams)
      .then((rows) => {
        res.json(rows)
      }
      )
      .catch((err) => {
        // console.log(err);
        res.json({ "Error": true, "Message": err + "Error in  MySQL query" })
      })
  };

});

module.exports = router;