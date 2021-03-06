const router = require('express').Router();
const auth = require('./auth');
const suggestion = require('./suggestion');
const manufacture = require('./manufacture');
const stock = require('./stock');
const produce = require('./produce');
const product = require('./product');
const plant = require('./plant');
const customer = require('./customer');
const admin = require('./admin');
const geocode = require('./geocode');
const survey = require('./survey');
const geolocation = require('./geolocation');
const kakao = require('./kakao');
const cafe24 = require('./cafe24');
const result = require('./result');

router.use('/auth', auth);
router.use('/customer', customer);
router.use('/suggestion', suggestion);
router.use('/manufacture', manufacture);
router.use('/stock', stock);
router.use('/produce', produce);
router.use('/product', product);
router.use('/plant', plant);
router.use('/admin', admin);
router.use('/geocode', geocode);
router.use('/survey', survey);
router.use('/geolocation', geolocation);
router.use('/cafe24', cafe24);
router.use('/kakao', kakao);
router.use('/result', result);

module.exports = router;