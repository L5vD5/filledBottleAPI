'use strict';

const pool = require('../../config/dbpool').pool;

module.exports.create = (user, data, fileName, callback) => {
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }

    const query = `INSERT INTO \`produce\` (\`user_id\`, \`weather\`, \`rain\`, \`snow\`, \`temperatures\`, \`min_temp\`, \`max_temp\`, \`product_id\`, \`process\`, \`name\`, \`content\`, \`area\`, \`expected_output\`, \`file_name\`)
                    VALUES (?, '${data.weather}', ${data.rain}, ${data.snow}, ${data.temperatures}, ${data.minTemp}, ${data.maxTemp}, ?, '${data.process}', '${data.name}', '${data.content}', '${data.area}', '${data.expected}', '${fileName}');`;
    const exec = conn.query(query, [user.id, data.product_id], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);

      return callback(err, result);
    });
  });
};

module.exports.getTotal = (user, name, first_date, last_date, callback) => {
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    const query = `SELECT count(*) as total
                  FROM produce as P JOIN users as U ON P.user_id = U.id
                  JOIN product as Pt ON P.product_id = Pt.id
                  WHERE P.user_id = ?
                  AND DATE(P.\`created_date\`) BETWEEN '${first_date}' AND '${last_date}'
                  ${name !== '' ? `AND Pt.name = '${name}'` : ``}`;

    const exec = conn.query(query, [user.id], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);

      return callback(err, result);
    });
  });
};

module.exports.getList = (user, page, name, first_date, last_date, callback) => {
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    const query = `SELECT P.id as id, P.created_date, Pt.name as productName, Pt.id as productId, P.name, P.process, P.area, P.expected_output as expected
    FROM produce as P JOIN users as U ON P.user_id = U.id
    JOIN product as Pt ON Pt.id = P.product_id
    WHERE P.user_id = ?
    AND DATE(P.\`created_date\`) BETWEEN '${first_date}' AND '${last_date}'
    ${name !== '' ? `AND Pt.name = '${name}'` : ``}
    ORDER BY created_date DESC
    ${(page !== 'all' ? `LIMIT ${5*(page-1)}, 5` : '')}`;

    const exec = conn.query(query, [user.id], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);

      return callback(err, result);
    });
  });
};

module.exports.getDetail = (user, id, callback) => {
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    const query = `SELECT P.*, Pt.name as productName
                  FROM produce as P JOIN users as U ON P.user_id = U.id
                  JOIN product as Pt ON P.product_id = Pt.id
                  WHERE P.user_id = ?
                  AND P.id = ?`;

    const exec = conn.query(query, [user.id, id], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);

      return callback(err, result);
    });
  });
};