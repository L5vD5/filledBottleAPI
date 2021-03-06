
const Users = require('../../../models/Users');

exports.getInfo = (req, res) => {
  Users.getInfo(req.user.id, (err, rows) => {
    if(err) throw err;
    res.status(200).send(rows);
  })
}

exports.updateInfo = (req, res) => {
  Users.updateInfo(req.user.id, req.body, (err, rows) => {
    if(err) throw err;
    res.status(200).send(rows);
  })
}

exports.getListByFamily = (req, res) => {
  Users.getListByFamily(req.params.productFamily, (err, rows) => {
    if(err) throw err;
    res.status(200).send(rows);
  })
}

exports.getInfoOpen = (req, res) => {
  Users.getInfoOpen(req.params.id, (err, rows) => {
    if(err) throw err;
    res.status(200).send(rows);
  })
}