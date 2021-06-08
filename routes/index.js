const express = require('express');
const router = express.Router();

// helper functions

function checkYearFormat(year) {
  var checkYear = !!(+year == year && year.length === 4 && year.trim() == year);
  return checkYear;
}


function checkRowLength(res, rows, params) {

  if (params) {
    const keys = Object.keys(params);
    const values = Object.values(params);

    const key1 = keys[0];
    const key2 = keys[1];
    const param1 = values[0];
    const param2 = values[1];
  }
  if (!rows.length) {
    !key2 ? (res.json({ "Error": false, "Message": "No records matching your search query: \' " + key1 + " : " + param1 + " \'. " })) : (res.json({ "Error": false, "Message": "No records matching your search query \' " + key1 + " : " + param1 + " \' and \' " + key2 + " : " + param2 + " \'." }))
  } else {
    res.json({ "Error": false, "Message": "Success", "Query Results ": rows })
  }

}


const withOptionalRankParams = function (queryBuilder, params) {

  const { year, country, ...invalidRemaining } = params;
  invalidKeys = Object.keys(invalidRemaining);

  const keys = Object.keys(params);
  const values = Object.values(params);

  const key1 = keys[0];
  const key2 = keys[1];
  const param1 = values[0];
  const param2 = values[1];

  if (invalidKeys) {
    res.status(400).json({ "Error": true, "Message": "Invalid Query Parameters. Only year and country are permitted." })
  }
  if (param1 && param2) {
    queryBuilder.where(key1, param1).andWhere(key2, param2);
  }
  if (param1 && !param2) {
    queryBuilder.where(key1, param1);
  }

};


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
  res.render('index', { title: 'World Happiness Rankings' });
});


// GET rankings Page
router.get("/rankings", function (req, res, next) {

  // destructure req.query then do a check to see if invalidRemaining holds any values and , if so, throw invalid response, 
  // const { year, country, ...invalidRemaining } = req.query;
  // invalidKeys = Object.keys(invalidRemaining);

  // old param variable.... pending delete
  optionalRankParams = req.query;

  req.db.from('rankings')
    .select('rank', 'country', 'score', 'year')
    .modify(withOptionalRankParams, optionalRankParams)
    .orderBy('year', 'desc')
    .then((rows) => {
      checkRowLength(res, rows, optionalRankParams)
    })
    .catch((err) => {
      console.log(err);
      res.json({ "Error": true, "Message": "Invalid query parameters. Query parameters are not permitted." })
    })
});

router.get("/countries", function (req, res, next) {
  req.db.from('rankings')
    .select('country')
    .distinct()
    .orderBy('country', 'ASC')
    .then((rows) => {
      checkRowLength(res, rows)
    })
    .catch((err) => {
      console.log(err);
      res.json({ "Error": true, "Message": "Invalid query parameters. Query parameters are not permitted." })
    })
})

const authorize = (req, res, next) => {
  const authorization = req.headers.authorization;
  let token = null;

  // const exampleToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1pa2VAZ21haWwuY29tIiwiZXhwIjoxNjIyNzIxMzAyLCJpYXQiOjE2MjI2MzQ5MDJ9.0tG9uRePqlehYSEhkJl1txfwUNBs1uYIicDjfA14k0Y";

  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1]
    console.log("Tokens ", token)
  }
  else {
    res.status(401).json({ error: true, message: "err + : Unauthorized" })
    return
  }

  // verify JWT Token
  try {
    const decode = jwt.verify(token, secretKey)

    if (decoded.exp < Date.now()) {
      res.status(401).json({ error: true, message: "Token Expired" })
      return
    }

    // permit user to advance
    next()
  } catch (e) {
    res.status(401).json({ error: true, message: err + " : Unathorized" })
  }
}

// factors page
router.get("/factors/:year", authorize, function (req, res, next) {
  // catch the 404 error for navigating straight to factors with a year in the url

  const optionalFactorParams = req.query;
  const year = req.params.year;
  var validYear = checkYearFormat(year);

  if (!validYear) {
    res.status(400).json({ message: "Invalid year format. Format must be yyyy" });
  } else {
    req.db.from('rankings').select('*').where('year', year)
      .modify(withOptionalFactorParams, optionalFactorParams)
      .then((rows) => {
        if (!rows.length) {
          res.json({ "Error": false, "Message": "There are no matching records this query" })
        } else {
          res.json({ "Error": false, "Message": "Success", "Country Factors: ": rows })
        }
      })
      .catch((err) => {
        console.log(err);
        res.json({ "Error": true, "Message": "Error in  MySQL query" })
      })
  };

});

module.exports = router;