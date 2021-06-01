const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'World Happiness Rankings' });
});

router.get('/api', function (req, res, next) {
  res.render('index', { title: "World Happiness Rankings" });
});

router.get("/api/rankings", function (req, res, next) {

  let country = req.query.country;
  let year = req.query.year;

  const withOptionalVar = function (queryBuilder) {
    if (country && year) {
      queryBuilder.where('country', country).andWhere('year', year)
    }
    if (country && !year) {
      queryBuilder.where('country', country)
    }
    if (!country && year) {
      queryBuilder.where('year', year)
    }
  };

  req.db.from('rankings')
    .select('country', 'rank', 'score', 'year')
    .modify(withOptionalVar)
    .orderBy('year', 'desc')
    .then((rows) => {
      res.json({ "Error": false, "Message": "Success", "Rankings": rows })
    })
    .catch((err) => {
      console.log(err);
      res.json({ "Error": true, "Message": "Error in  MySQL query" })
    })
});

router.get("/api/countries", function (req, res, next) {
  req.db.from('rankings')
    .select('country')
    .distinct()
    .orderBy('country', 'ASC')
    .then((rows) => {
      res.json({ "Error": false, "Message": "Success", "Here are all the surveyed countries": rows })
    })
    .catch((err) => {
      console.log(err);
      res.json({ "Error": true, "Message": "Error in  MySQL query" })
    })
})
module.exports = router;


router.get("/api/factors/:year", function (req, res, next) {
  // catch the 404 error for navigating straight to factors with a year in the url
  let country = req.query.country;
  let limit = req.query.limit;
  var year = req.params.year;

  const withOptionalVar = function (queryBuilder) {
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

  if (!year) {
    res.status(400).json({ message: "error with search request, please enter a year" });
  } else {
    req.db.from('rankings').select('*').where('year', year)
      .modify(withOptionalVar)
      .then((rows) => {
        res.json({ "Error": false, "Message": "Success", "Here are all the surveyed countries": rows })
      })
      .catch((err) => {
        console.log(err);
        res.json({ "Error": true, "Message": "Error in  MySQL query" })
      })
  };
});