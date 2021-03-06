const router = require('express').Router();
const passport = require('passport');
const manufacture = require('./manufacture');

function checkAuthed(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.header('Access-Control-Allow-Origin', '*');
    res.status(401).json({ message: 'Not logged in!' });
    //res.redirect(301, 'http://cosimo.iptime.org:3000/#/login')
  }
}

router.post('/total/',
  passport.authenticate('JWT', { session: false }),
  checkAuthed,
  manufacture.getTotal
);

router.post('/list',
  passport.authenticate('JWT', { session: false }),
  checkAuthed,
  manufacture.getList
);

router.get('/:id',
  passport.authenticate('JWT', { session: false }),
  checkAuthed,
  manufacture.getDetail
);

router.put('/cancel/:id',
  passport.authenticate('JWT', { session: false }),
  checkAuthed,
  manufacture.manufactureReverse
);

router.post('/',
  passport.authenticate('JWT', { session: false }),
  checkAuthed,
  manufacture.manufacture
);


module.exports = router;