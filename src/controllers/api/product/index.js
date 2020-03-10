const router = require('express').Router();
const passport = require('passport');
const product = require('./product');

function checkAuthed(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.header('Access-Control-Allow-Origin', '*');
    res.status(401).json({ message: 'Not logged in!' });
    //res.redirect(301, 'http://cosimo.iptime.org:3000/#/login')
  }
}

//회원이 취급하는 품목군 리스트 주기
router.get('/familyList/:categoryId',
  passport.authenticate('JWT', { session: false }),
  checkAuthed,
  product.getFamilyList
);

router.get('/allFamily/:categoryId',
  passport.authenticate('JWT', { session: false }),
  checkAuthed,
  product.getAllFamily
);

router.get('/familyCategory',
  passport.authenticate('JWT', { session: false }),
  checkAuthed,
  product.getFamilyCategory
);

router.get('/userFamilyCategory',
  passport.authenticate('JWT', { session: false }),
  checkAuthed,
  product.getUserFamilyCategory
);

router.post('/modifyFamily',
	passport.authenticate('JWT', { session: false }),
	checkAuthed,
	product.modifyFamily
)

module.exports = router;