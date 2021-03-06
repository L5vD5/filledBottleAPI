'use strict';

const pool = require('../../config/dbpool').pool;
const async = require('async');

module.exports.convertStock = async (product_id, quantity, user, memo, callback) => { //영헌) 안쓰이는듯. 이 모듈을 사용하는 api가 없음
  try{
    const select_query = `SELECT S.* FROM stock as S JOIN product as P ON S.product_id = P.id
      WHERE P.user_id = ?
      AND P.\`set\` = 1
      AND P.id = ?
      ORDER BY S.id DESC
      LIMIT 1
      `;
    const [rows_select, field_select] = await pool.query(select_query,[user.id,product_id]);
    console.log('convertStock select');    
    try {
      const current = rows_select[0].quantity
      const change = quantity - current;
      const insert_query = `INSERT INTO stock (\`product_id\`, \`quantity\`, \`change\`, \`memo\`) VALUES (${product_id}, ${quantity}, ${change}, '${memo}')`;
      const [rows_insert, field_insert] = await pool.query(insert_query,[user.id,product_id]);
      return callback(null, rows_insert);
    }
    catch(error) {
      console.log('convertStock insert error',error);
      return;
    }
  }
  catch(error) {
    console.log('convertStock select error',error);
    return;
  }
};

module.exports.convertStock1 = (product_id, quantity, user, memo, callback) => {
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    const select_query = `SELECT S.* FROM stock as S JOIN product as P ON S.product_id = P.id
    WHERE P.user_id = ?
    AND P.\`set\` = 1
    AND P.id = ?
    ORDER BY S.id DESC
    LIMIT 1
    `;
    const exec = conn.query(select_query, [user.id, product_id], (err, result) => {
      console.log('실행 sql : ', exec.sql);
      const current = result[0].quantity
      const change = quantity - current;
      const insert_query = `INSERT INTO stock (\`product_id\`, \`quantity\`, \`change\`, \`memo\`) VALUES (${product_id}, ${quantity}, ${change}, '${memo}')`;
      const exec2 = conn.query(insert_query, (err2, result2) => {
				conn.release();
        console.log('실행 sql : ', exec2.sql);
        return callback(err2, result2);
      })
    });
  });
};

module.exports.modifyStock1 = (stockData, user, callback) => { //영헌) 현재 프론트에서 안쓰임. 원래 코드도 실행 안되는듯함.
  console.log('modifyStock')
  stockData.map(async (e, i) => {
    if(e.next !== undefined && e.next !== 0) {
      const {next, id, quantity} = e;//quantity => prev, next => next
      try{
        const insert_query = `INSERT INTO \`stock_modify\` (\`user_id\`, \`stock_id\`, \`quantity\`) VALUES (${user.id}, ${id}, ${next-quantity})`;
        await pool.query(insert_query);
        console.log('modifyStock insert');
      }
      catch(error){
        console.log('modifyStock insert error');
      }
      try{
        const update_query = `UPDATE \`stock\` SET \`quantity\`='${next}' WHERE \`id\`='${id}'`;
        console.log('modifyStock update');
        const [rows_update, field_update] = await pool.query(update_query);
        return callback(null, rows_update);
      }
      catch(error){
        console.log('modifyStock update error')
      }
    }
  });
};

module.exports.modifyStock = (stockData, user, callback) => {
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
		}
		stockData.map((e, i) => {
			if(e.next !== undefined && e.next !== 0) {
        const {next, id, quantity} = e;//quantity => prev, next => next
        const insert_query = `INSERT INTO \`stock_modify\` (\`user_id\`, \`stock_id\`, \`quantity\`) VALUES (${user.id}, ${id}, ${next-quantity})`
				const exec = conn.query(insert_query, (err, result) => {
          console.log('실행 sql : ', exec.sql);
        });
				const update_query = `UPDATE \`stock\` SET \`quantity\`='${next}' WHERE \`id\`='${id}'`
				const exec2 = conn.query(update_query, (err, result) => {
					conn.release();
					console.log('실행 sql : ', exec2.sql);
					return callback(err, result);
				})
			}
		});
  });
};

module.exports.getLastStock = async (data, user, callback) => { //영헌) 현재 프론트에서 안쓰임.
  try{
    let {productId, plant} = data; //id = 주문 id
    const select_query = `SELECT S.* FROM stock as S JOIN product as P ON S.product_id = P.id
    WHERE P.user_id = ?
		AND P.\`set\` = 1
		AND S.plant_id = ${plant}
    AND P.id = ?
    ORDER BY S.id DESC
    LIMIT 1
		`;
    const [rows, field] = await pool.query(select_query, [user.id, productId]);
    console.log('getLastStock');    
    //console.log('실행 sql : ', exec.sql);
    const current = rows.length > 0 ? rows[0].quantity : 0;
    return callback(null, {current});
  }
  catch(error) {
    console.log('getLastStock error dd',error);
    return callback(error, null);
  }
}

module.exports.getLastStock1 = (data, user, callback) => {
	let {productId, plant} = data; //id = 주문 id
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    const select_query = `SELECT S.* FROM stock as S JOIN product as P ON S.product_id = P.id
    WHERE P.user_id = ?
		AND P.\`set\` = 1
		AND S.plant_id = ${plant}
    AND P.id = ?
    ORDER BY S.id DESC
    LIMIT 1
		`;
		
    const exec = conn.query(select_query, [user.id, productId], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);
			const current = result.length > 0 ? result[0].quantity : 0;
      return callback(err, {current});
    });
	});
}

module.exports.transportStock = async (data, user, callback) => {
  let {productId, start, dest, quantity, current1, current2} = data; //id = 주문 id
  if(start === dest) {
    return callback(null, {msg: 'same plant'});
  }
  try{   
    const insert_query = `INSERT INTO stock (\`product_id\`, \`quantity\`, \`plant_id\`, \`change\`, \`memo\`)
			VALUES (${productId}, ${current1-quantity}, ${start}, ${-quantity}, '창고 이동');`;
    await pool.query(insert_query);
    console.log('transportStock insert1');    
    //console.log('실행 sql : ', exec.sql);
    return callback(null, rows);
  }
  catch(error) {
    console.log('transportStock insert1 error',error);
  }
  try{   
    const insert_query2 = `INSERT INTO stock (\`product_id\`, \`quantity\`, \`plant_id\`, \`change\`, \`memo\`)
			VALUES (${productId}, ${parseInt(current2)+parseInt(quantity)}, ${dest}, ${quantity}, '창고 이동');`;
    await pool.query(insert_query2);
    console.log('transportStock insert2');    
    //console.log('실행 sql : ', exec.sql);
    return callback(err, {});
  }
  catch(error) {
    console.log('transportStock insert2 error',error);
  }
}

module.exports.createStock = async (user, data, callback) => { //영헌) user 안쓰이고 있음.
	let {productId, quantity, plant, type, name, expiration, date_manufacture} = data;
	console.log('createStock data: ',data);
  try{
    const select_query = `SELECT count(*) as total FROM stock WHERE product_id = ${productId} and plant_id = ${plant};`
    const [rows_select, fields_select] = await pool.query(select_query);

    const insert_query = 
      `INSERT INTO stock 
      (\`product_id\`, \`plant_id\`, \`quantity\`, \`initial_quantity\`, \`name\`, \`date_manufacture\`, \`expiration\`, \`type\`) 
      VALUES (${productId}, ${plant}, ${quantity}, '${quantity}', '${name + " (" +(parseInt(rows_select[0].total)+1)+")"}', '${date_manufacture}', '${expiration}', '${type}')`;
    const [rows_insert, fields_insert] = await pool.query(insert_query);
    console.log('createStock');    
    return callback(null, rows_insert);
  }
  catch(error) {
    console.log('createStock error',error);
  }
};

//생산 모듈을 통한 재고 변경
module.exports.convertStockByProduce = (user, data, callback) => { //영헌) 안쓰이는듯.
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    const select_query = `SELECT S.* FROM stock as S JOIN product as P ON S.product_id = P.id
    WHERE P.user_id = ?
    AND P.\`set\` = 1
    AND P.id = ?
    ORDER BY S.id DESC
    LIMIT 1
    `;
    const exec = conn.query(select_query, [user.id, product_id], (err, result) => {
      console.log('실행 sql : ', exec.sql);
      const current = result[0].quantity
      const change = quantity - current;
      const insert_query = `INSERT INTO stock (\`product_id\`, \`quantity\`, \`change\`, \`memo\`) VALUES (${product_id}, ${quantity}, ${change}, '생산으로 인한 재고 수정')`;
      const exec2 = conn.query(insert_query, (err2, result2) => {
        console.log('실행 sql : ', exec2.sql);
        return callback(err2, result2);
      })
    });
  });
};
//주문 모듈을 통한 재고 변경 
module.exports.convertStockByOrderReverse = (user, data, callback) => { //영헌) 안쓰이는듯.
	const {id} = data; //id = 주문 id
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
		}
		const order_query = `SELECT * FROM order_product WHERE order_id = ?`
		const exec = conn.query(order_query, [id], (err, result) => {
			console.log('실행 sql : ', exec.sql);
			console.log(result)
			let {length} = result;

			result.forEach(e => {
				const select_query = `SELECT S.* FROM stock as S JOIN product as P ON S.product_id = P.id
				WHERE P.user_id = ?
				AND P.\`set\` = 1
				AND P.id = ${e.product_id}
				ORDER BY S.id DESC
				LIMIT 1`;
        const exec = conn.query(select_query, [user.id], (err, result2) => {
					console.log('실행 sql : ', exec.sql);
					console.log('r2: ',result2)
          const current = result2[0].quantity
          const change = e.quantity;
          const insert_query = `INSERT INTO stock (\`product_id\`, \`quantity\`, \`change\`, \`memo\`)
                                VALUES (${e.product_id}, ${parseInt(current)+parseInt(change)}, ${change}, '출고 취소로 인한 재고 수정')`;
          const exec2 = conn.query(insert_query, (err2, result3) => {
            console.log('실행 sql : ', exec2.sql);
            if((--length) == 0){
              conn.release();
              return callback(false, result2);
            }
          })
        });
			})
		});
	});
};

//주문 모듈을 통한 재고 변경
module.exports.convertStockByOrder = function (user, data, callback) { 
  pool.getConnection(async function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }

    for (const item of data.productInfo) {
      async function updateStock(item) {
        const update_query = `UPDATE stock SET quantity = quantity - ${item.quantity} WHERE id = ${item.stockId}`;
        const exec = conn.query(update_query, (err, result) => {
          console.log('실행 sql : ', exec.sql);
        });
      }
      await updateStock(item);
    }
    console.warn('End')

		// const order_query = `SELECT * FROM order_product WHERE order_id = ?`
		// const exec = conn.query(order_query, [id], (err, result) => {
    //   console.log('실행 sql : ', exec.sql);
    //   console.warn(result)

			// let {length} = result;

			// let ret = [];
			// result.forEach(e => {
			// 	const select_query = `SELECT S.* FROM stock as S JOIN product as P ON S.product_id = P.id
			// 	WHERE P.user_id = ?
			// 	AND P.\`set\` = 1
			// 	AND P.id = ${e.product_id}
			// 	AND S.plant_id = ${e.plant_id}
			// 	ORDER BY S.id DESC
			// 	LIMIT 1`;
      //   const exec = conn.query(select_query, [user.id], (err2, result2) => {
			// 		console.log('실행 sql : ', exec.sql);
			// 		console.log('r2: ',result2)
			// 		const op_id = result2[0].id;
      //     const current = result2[0].quantity
      //     const change = -e.quantity;
      //     const insert_query = `INSERT INTO stock (\`product_id\`, \`plant_id\`, \`quantity\`, \`change\`, \`memo\`)
      //                           VALUES (${e.product_id}, ${e.plant_id}, ${parseInt(current)+parseInt(change)}, ${change}, '출고로 인한 재고 수정')`;
      //     const exec2 = conn.query(insert_query, (err3, result3) => {
			// 			console.log('실행 sql : ', exec2.sql);
			// 			const update_query = `UPDATE order_product SET \`stock_id\`=${result3.insertId} WHERE \`id\` = ${op_id}`
			// 			const exec3 = conn.query(update_query, (err4, result4) => {
			// 				console.log('실행 sql : ', exec3.sql);
			// 			});
			// 			ret.push(result3);
      //       if((--length) == 0){
      //         conn.release();
      //         return callback(false, ret);
      //       }
      //     })
      //   });
			// })
		// });
	});
};

//제조 모듈을 통한 재고 변경
module.exports.convertStockByManufacture = async (user, data, callback) => { //영헌) 안쓰이는듯.
	var res = {consume: [], produce: []};
  await pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    if(data.sProduct1[0].id === '') {
      data.sProduct1 = [];
    }
    if(data.sProduct2[0].id === '') {
      data.sProduct2 = [];
		}

    data.sProduct1.map((e, i) => {
      const select_query = `SELECT S.* FROM stock as S JOIN product as P ON S.product_id = P.id
                            WHERE P.user_id = ?
                            AND P.\`set\` = 1
                            AND P.id = ${e.id}
                            ORDER BY S.id DESC
                            LIMIT 1`;
      const exec = conn.query(select_query, [user.id], (err, result) => {
        console.log('실행 sql : ', exec.sql);
        const current = result[0].quantity;
        const change = -e.quantity;
        const insert_query = `INSERT INTO stock (\`product_id\`, \`plant_id\`, \`quantity\`, \`change\`, \`memo\`)
                              VALUES (${e.id}, ${e.plant}, ${current+change}, ${change}, '제조로 인한 재고 수정')`;
        const exec2 = conn.query(insert_query, (err2, result2) => {
          console.log('실행 sql : ', exec2.sql);
					res.consume.push(result2);
					//foreach 마지막에 생산 재고 입력 시작
					if(i === data.sProduct1.length-1) {
						if(data.sProduct2.length !== 0) {
							let {length} = data.sProduct2
							data.sProduct2.forEach(e => {
								const select_query = `SELECT S.* FROM stock as S JOIN product as P ON S.product_id = P.id
																			WHERE P.user_id = ?
																			AND P.\`set\` = 1
																			AND P.id = ${e.id}
																			ORDER BY S.id DESC
																			LIMIT 1`;
								const exec = conn.query(select_query, [user.id], (err, result) => {
									console.log('실행 sql : ', exec.sql);
									const current = result[0].quantity
									const change = e.quantity;
									const insert_query = `INSERT INTO stock (\`product_id\`, \`plant_id\`, \`quantity\`, \`change\`, \`memo\`)
																				VALUES (${e.id}, ${e.plant}, ${parseInt(current)+parseInt(change)}, ${change}, '제조로 인한 재고 수정')`;
									const exec2 = conn.query(insert_query, (err2, result2) => {
										console.log('실행 sql : ', exec2.sql);
										res.produce.push(result2);
										if((--length) == 0){
											conn.release();
											return callback(false, res);
										}
									})
								});
							});
						} else {
							conn.release();
							return callback(false, res);
						}				
					}
        })
      });
    });

  });
};

//생산 모듈을 통한 재고 변경
module.exports.convertStockByManufactureReverse = async (user, data, callback) => { //영헌) 안쓰이는듯.
  var res = {consume: [], produce: []};
  await pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    if(data.sProduct1[0].id === '') {
      data.sProduct1 = [];
    }
    if(data.sProduct2[0].id === '') {
      data.sProduct2 = [];
    }

    data.sProduct1.map((e, i) => {
      const select_query = `SELECT S.* FROM stock as S JOIN product as P ON S.product_id = P.id
                            WHERE P.user_id = ?
                            AND P.\`set\` = 1
                            AND P.id = ${e.product_id}
                            ORDER BY S.id DESC
                            LIMIT 1`;
      const exec = conn.query(select_query, [user.id], (err, result) => {
        console.log('실행 sql : ', exec.sql);
				const current = result[0].quantity;				
        const change = -e.change;
        const insert_query = `INSERT INTO stock (\`product_id\`, \`quantity\`, \`change\`, \`memo\`)
                              VALUES (${e.product_id}, ${parseInt(current)+parseInt(change)}, ${change}, '제조 취소로 인한 재고 수정')`;
        const exec2 = conn.query(insert_query, (err2, result2) => {
          console.log('실행 sql : ', exec2.sql);
					res.consume.push(result2);
					//foreach 마지막에 생산 재고 입력 시작
					if(i === data.sProduct1.length-1) {
						if(data.sProduct2.length !== 0) {
							let {length} = data.sProduct2
							data.sProduct2.forEach(e => {
								const select_query = `SELECT S.* FROM stock as S JOIN product as P ON S.product_id = P.id
																			WHERE P.user_id = ?
																			AND P.\`set\` = 1
																			AND P.id = ${e.product_id}
																			ORDER BY S.id DESC
																			LIMIT 1`;
								const exec = conn.query(select_query, [user.id], (err, result) => {
									console.log('실행 sql : ', exec.sql);
									const current = result[0].quantity;
									console.log(current)
									const change = -e.change;
									const insert_query = `INSERT INTO stock (\`product_id\`, \`quantity\`, \`change\`, \`memo\`)
																				VALUES (${e.product_id}, ${parseInt(current)+parseInt(change)}, ${change}, '제조 취소로 인한 재고 수정')`;
									const exec2 = conn.query(insert_query, (err2, result2) => {
										console.log('실행 sql : ', exec2.sql);
										res.produce.push(result2);
										if((--length) == 0){
											conn.release();
											return callback(false, res);
										}
									})
								});
							});
						} else {
							conn.release();
							return callback(false, res);
						}
					}
        })
      });
    });
  });
};


//재고 리스트 주기
module.exports.getStockQuantity = async (user, callback) => {
  try{
    const query = `SELECT b.* FROM (SELECT product_id, MAX(id) AS id
      FROM \`en\`.\`stock\` GROUP BY product_id) AS a JOIN
      (SELECT S.quantity, S.id as id, P.weight, P.name, P.grade, S.product_id, S.changeDate, P.date, P.file_name
        FROM \`en\`.\`stock\` AS S JOIN \`en\`.\`product\` AS P ON S.product_id = P.id
        WHERE P.user_id = ? AND P.\`set\` = 1
      ) AS b
      ON a.product_id = b.product_id AND a.id = b.id
      ORDER BY b.date DESC;`;
    const [rows, fields] = await pool.query(query, [user.id]);
    console.log('getStockQuantity')
    return callback(null, rows);
  }
  catch(error){
    console.log('getStockQuantity error', error)
  }
}

/*
module.exports.getStockList = (user, page, callback) => {
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    const query = `SELECT b.* FROM
    (SELECT product_id, MAX(id) as id
      FROM \`en\`.\`stock\` GROUP BY product_id
    ) AS a JOIN
    (SELECT S.quantity, S.id as id, P.weight, P.name, P.grade, S.product_id, S.changeDate, P.date
      FROM \`en\`.\`stock\` AS S JOIN \`en\`.\`product\` AS P ON S.product_id = P.id
      WHERE P.user_id = ? AND P.\`set\` = 1
    ) AS b
    ON a.product_id = b.product_id AND a.id = b.id
    ORDER BY b.date DESC
    ${(page !== 'all' ? `LIMIT ${5*(page-1)}, 5` : '')};`;
    const exec = conn.query(query, [user.id], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);
      return callback(err, result);
    });
  });
}*/

module.exports.getStockHistoryTotal = async (user, data, callback) => { //영헌) change = changeDate?
	const {plant} = data;
  try{
    const query = `SELECT count(*) as total
      FROM stock as S JOIN product as P ON S.product_id = P.id
      JOIN plant as PL ON PL.id = S.plant_id
      WHERE P.user_id = ?
      AND \`changeDate\` IS NOT NULL
      ${plant !== 'all' ? `AND PL.id = '${plant}'` : ``}`;
    const [rows, fields] = await pool.query(query, [user.id]);
    console.log('getStockHistoryTotal')
    return callback(null, rows);
  }
  catch(error){
    console.log('getStockHistoryTotal error', error)       
  }
}

module.exports.getStockHistoryTotal1 = (user, data, callback) => {
	const {plant} = data;

  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
		const query = `SELECT count(*) as total
		FROM stock as S JOIN product as P ON S.product_id = P.id
		JOIN plant as PL ON PL.id = S.plant_id
		WHERE P.user_id = ?
		AND \`changeDate\` IS NOT NULL
		${plant !== 'all' ? `AND PL.id = '${plant}'` : ``}`;
    const exec = conn.query(query, [user.id], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);
      return callback(err, result);
    });
  });
}
//재고 모듈에서 리스트 불러오기
module.exports.getStockHistoryList = async (user, data, callback) => { //영헌) query 문법 오류, const인 limit에 값 새로 지정 시도
	const {page, limit, plant} = data;
	if(!limit) {
    limit = 15
  }
  try{
    const query = `SELECT S.*, P.*, PL.name as plantName
      FROM stock as S JOIN product as P ON S.product_id = P.id
      LEFT JOIN plant as PL ON PL.id = S.plant_id
      WHERE P.user_id = ?
      AND \`changeDate\` IS NOT NULL
      ${plant !== 'all' ? `AND PL.id = '${plant}'` : ``}
      ORDER BY S.id DESC
      ${page !== 'all' ? `LIMIT ${limit*(page-1)}, ${limit}` : ''}`;
    const [rows, fields] = await pool.query(query, [user.id]);
    console.log('getStockHistoryList')
    return callback(null, rows);
  }
  catch(error){
    console.log('getStockHistoryList error', error)
  }
}

module.exports.getStockHistoryList1 = (user, data, callback) => {
	const {page, limit, plant} = data;
	if(!limit) {
    limit = 15
	}
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
		const query = `SELECT S.*, P.*, PL.name as plantName
		FROM stock as S JOIN product as P ON S.product_id = P.id
		LEFT JOIN plant as PL ON PL.id = S.plant_id
		WHERE P.user_id = ?
		AND \`changeDate\` IS NOT NULL
		${plant !== 'all' ? `AND PL.id = '${plant}'` : ``}
		ORDER BY S.id DESC
		${page !== 'all' ? `LIMIT ${limit*(page-1)}, ${limit}` : ''}`;
    const exec = conn.query(query, [user.id], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);
      return callback(err, result);
    });
  });
}

//재고 관리 모듈 리스트 주기
module.exports.getStockList2 = (user, data, callback) => { //영헌) 안쓰이는듯.
	const {page, name, family, plant, useFamilyData} = data;
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
		}
		let familyInPlant = ``;
		useFamilyData.map((e, i) => {
				familyInPlant += `'${e.family}' ,`;
		});
		familyInPlant = familyInPlant.slice(0, -1);
		const query = `SELECT b.* FROM
		(SELECT product_id, MAX(S.id) as id
			FROM \`en\`.\`stock\` as S JOIN plant as P ON S.plant_id = P.id
			GROUP BY product_id, plant_id
		) AS a JOIN
		(SELECT S.quantity, S.id as id, P.weight, P.name, P.grade, S.product_id, S.changeDate, P.date, P.file_name, PL.name as plantName
			FROM \`en\`.\`stock\` AS S JOIN \`en\`.\`product\` AS P ON S.product_id = P.id
			JOIN plant as PL ON PL.id = S.plant_id
			WHERE P.user_id = ?
			${name !== '' ? `AND P.name = '${name}'` : ``}
			${family !== 0 ? `AND P.family = '${family}'` : ``}
			${useFamilyData.length !== 0 ? `AND P.family IN (${familyInPlant})` : `AND P.family = 0`}
			${plant !== 'all' ? `AND PL.id = '${plant}'` : ``}
			AND P.\`set\` = 1
		) AS b
		ON a.product_id = b.product_id AND a.id = b.id
		ORDER BY b.date DESC
		${(page !== 'all' ? `LIMIT ${15*(page-1)}, 15` : '')};`;
		const exec = conn.query(query, [user.id], (err, result) => {
			conn.release();
			console.log('실행 sql : ', exec.sql);
			return callback(err, result);
		});
  });
}

//재고 관리 모듈 리스트 주기 (사용중)
module.exports.getStockList = async (user, data, callback) => {//영헌) user 안쓰임
	const {pageNumbers, name, family, plant} = data;
	try{
    const query = `SELECT S.*, P.name as productName, PL.name as plantName, P.file_name as file_name FROM \`stock\` as S
			JOIN \`product\` as P ON P.id = S.product_id
			JOIN \`plant\` as PL ON PL.id = S.plant_id
			WHERE S.name LIKE '%${name}%'
			${plant !== 'all' ? `AND S.plant_id = ${plant}` : ``}
			${family !== 0 ? `AND P.family = '${family}'` : ``}
			${(pageNumbers !== 'all' ? `LIMIT ${15*(pageNumbers-1)}, 15` : '')};`;
    const [rows, fields] = await pool.query(query);
    console.log('getStockList')
    return callback(null, rows);
  }
  catch(error){
    console.log('getStockList error', error)
  }
}

//재고 상세에서 주문 리스트 전달
module.exports.getStockOrder = async (user, data, callback) => {
	const {id} = data;
	
  try{
    const query=`
    SELECT O.shippingDate as date, OP.* FROM \`order_product\` as OP
    JOIN \`order\` as O ON OP.order_id = O.id
    WHERE (O.state = 'shipping' OR O.state = 'complete')
    AND O.user_id = '${user.id}'
    AND OP.stock_id = '${id}'`;
    const [rows, fields] = await pool.query(query);
    console.log('getStockOrder')
    return callback(null, rows);
  }
  catch(error){
    console.log('getStockOrder error')
  }
}


//재고 상세에서 입출고 리스트 전달
module.exports.getStockModify = async (user, id, callback) => {
	try{
    const query=`SELECT quantity, changeDate as date FROM \`stock_modify\`
      WHERE \`user_id\` = ${user.id}
      AND \`stock_id\` = ${id}`;
    const [rows, fields] = await pool.query(query);
    console.log('getStockModify')
    return callback(null, rows);
  }
  catch(error){
    console.log('getStockModify error')
  }
}

//Product Id를 받아와서 해당 Product의 재고 기록들을 주기
module.exports.getStockProduct = async (user, data, callback) => {
	try{
    const query = `SELECT S.*, P.name as plantName FROM stock as S
      JOIN plant as P ON S.plant_id = P.id
      WHERE product_id = ?
    `;
    const [rows, fields] = await pool.query(query, [data.id]);
    console.log('getStockProduct')
    return callback(null, rows);
  }
  catch(error){
    console.log('getStockProduct error')
  }
}

//재고 관리 모듈 리스트 총 개수 주기
module.exports.getStockTotal = async (user, data, callback) => {
  const {name, family, plant} = data;
  try{
    const query = `SELECT count(*) as total FROM \`stock\` as S
			JOIN \`product\` as P ON P.id = S.product_id
			JOIN \`plant\` as PL ON PL.id = S.plant_id
			WHERE S.plant_id = ${plant}
			${family !== 0 ? `AND P.family = '${family}'` : ``}
			AND S.name LIKE '%${name}%'
			`;
    const [rows, fields] = await pool.query(query, [user.id]);
    console.log('getStockTotal')
    return callback(null, rows);
  }
  catch(error){
    console.log('getStockTotal error')
  }
}

//재고 관리 모듈 재고 실사에서 페이지네이션 없이 리스트 전달
module.exports.getStockList3 = async (user, data, callback) => { //영헌) 모호한 현 이름 대신 getStockListNoPagenation?, 확인 결과 현재 안쓰이고 있음
  const {name, family, plant, useFamilyData} = data;
  try{
    let familyInPlant = ``;
		useFamilyData.map((e, i) => {
			familyInPlant += `'${e.family}' ,`;
		});
		familyInPlant = familyInPlant.slice(0, -1);
    const query = `SELECT b.* FROM
      (SELECT product_id, MAX(S.id) as id
        FROM \`en\`.\`stock\` as S JOIN plant as P ON S.plant_id = P.id
        GROUP BY product_id, plant_id
      ) AS a JOIN
      (SELECT S.quantity, S.id as id, P.weight, P.name, P.grade, S.product_id, S.changeDate, P.date, P.file_name, PL.name as plantName
        FROM \`en\`.\`stock\` AS S JOIN \`en\`.\`product\` AS P ON S.product_id = P.id
        JOIN plant as PL ON PL.id = S.plant_id
        WHERE P.user_id = ?
        ${name !== '' ? `AND P.name = '${name}'` : ``}
        ${family !== 0 ? `AND P.family = '${family}'` : ``}
        ${plant !== 'all' ? `AND PL.id = '${plant}'` : ``}
        ${useFamilyData.length !== 0 ? `AND P.family IN (${familyInPlant})` : `AND P.family = 0`}
        AND P.\`set\` = 1
      ) AS b
      ON a.product_id = b.product_id AND a.id = b.id
      ORDER BY b.date DESC;`;
    const [rows, fields] = await pool.query(query, [user.id]);
    console.log('getStockTotal3')
    return callback(null, rows);
  }
  catch(error){
    console.log('getStockTotal3 error')
  }
}

module.exports.getStockList3_old = (user, data, callback) => {
	const {name, family, plant, useFamilyData} = data;
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
		}
		let familyInPlant = ``;
		useFamilyData.map((e, i) => {
			familyInPlant += `'${e.family}' ,`;
		});
		familyInPlant = familyInPlant.slice(0, -1);
    const query = `SELECT b.* FROM
    (SELECT product_id, MAX(S.id) as id
			FROM \`en\`.\`stock\` as S JOIN plant as P ON S.plant_id = P.id
			GROUP BY product_id, plant_id
    ) AS a JOIN
    (SELECT S.quantity, S.id as id, P.weight, P.name, P.grade, S.product_id, S.changeDate, P.date, P.file_name, PL.name as plantName
			FROM \`en\`.\`stock\` AS S JOIN \`en\`.\`product\` AS P ON S.product_id = P.id
			JOIN plant as PL ON PL.id = S.plant_id
			WHERE P.user_id = ?
			${name !== '' ? `AND P.name = '${name}'` : ``}
			${family !== 0 ? `AND P.family = '${family}'` : ``}
			${plant !== 'all' ? `AND PL.id = '${plant}'` : ``}
			${useFamilyData.length !== 0 ? `AND P.family IN (${familyInPlant})` : `AND P.family = 0`}
			AND P.\`set\` = 1
    ) AS b
    ON a.product_id = b.product_id AND a.id = b.id
    ORDER BY b.date DESC;`;
    const exec = conn.query(query, [user.id], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);
      return callback(err, result);
    });
  });
}

//품목 관리 모듈에 재고 리스트 주기
module.exports.getStockSum = async (user, data, callback) => { //영헌) 안쓰이고 있음.
  const {page, name, family, category} = data;
  try{
    const query = `SELECT b.product_id, SUM(b.quantity) as quantity FROM
    (SELECT product_id, MAX(S.id) as id
			FROM \`en\`.\`stock\` as S LEFT JOIN plant as P ON S.plant_id = P.id
			GROUP BY product_id, plant_id
    ) AS a JOIN
    (SELECT S.quantity, S.id as id, P.weight, P.name, P.grade, S.product_id, S.changeDate, P.date, P.file_name, PL.name as plantName
			FROM \`en\`.\`stock\` AS S JOIN \`en\`.\`product\` AS P ON S.product_id = P.id
			LEFT JOIN plant as PL ON PL.id = S.plant_id
			LEFT JOIN productFamily_user as FU ON P.family = FU.family_id
			LEFT JOIN productFamily as F ON F.id = FU.family_id	
			WHERE P.user_id = ?
			${name !== '' ? `AND P.name = '${name}'` : ``}
			${family !== 0 ? `AND P.family = '${family}'` : ``}
			${category !== 0 ? `AND F.category = '${category}'` : ``}
			AND P.\`set\` = 1
    ) AS b
		ON a.product_id = b.product_id AND a.id = b.id
		GROUP BY a.product_id
		ORDER BY b.date DESC
    ${(page !== 'all' ? `LIMIT ${15*(page-1)}, 15` : '')};`;
    const [rows, fields] = await pool.query(query, [user.id]);
    console.log('getStockOption')
    return callback(null, rows);
  }
  catch(error){
    console.log('getStockOption error')
  }
}

module.exports.getStockSum1 = (user, data, callback) => {
	const {page, name, family, category} = data;
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    const query = `SELECT b.product_id, SUM(b.quantity) as quantity FROM
    (SELECT product_id, MAX(S.id) as id
			FROM \`en\`.\`stock\` as S LEFT JOIN plant as P ON S.plant_id = P.id
			GROUP BY product_id, plant_id
    ) AS a JOIN
    (SELECT S.quantity, S.id as id, P.weight, P.name, P.grade, S.product_id, S.changeDate, P.date, P.file_name, PL.name as plantName
			FROM \`en\`.\`stock\` AS S JOIN \`en\`.\`product\` AS P ON S.product_id = P.id
			LEFT JOIN plant as PL ON PL.id = S.plant_id
			LEFT JOIN productFamily_user as FU ON P.family = FU.family_id
			LEFT JOIN productFamily as F ON F.id = FU.family_id	
			WHERE P.user_id = ?
			${name !== '' ? `AND P.name = '${name}'` : ``}
			${family !== 0 ? `AND P.family = '${family}'` : ``}
			${category !== 0 ? `AND F.category = '${category}'` : ``}
			AND P.\`set\` = 1
    ) AS b
		ON a.product_id = b.product_id AND a.id = b.id
		GROUP BY a.product_id
		ORDER BY b.date DESC
    ${(page !== 'all' ? `LIMIT ${15*(page-1)}, 15` : '')};`;
    const exec = conn.query(query, [user.id], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);
      return callback(err, result);
    });
  });
}

module.exports.getStockFromManufactureByConsume = (id, callback) => { //영헌) 안쓰임
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    const query = `SELECT P.id as product_id, S.quantity, P.name, P.grade, P.weight, P.price_shipping, S.change
    FROM stock as S JOIN product as P ON S.product_id = P.id
    WHERE flag = 'manufacture_consume'
    AND flag_id = ?`;
  
    const exec = conn.query(query, [id], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);
      
      return callback(err, result);
    });
  });
}

module.exports.getStockFromManufactureByProduce = (id, callback) => { //영헌) 안쓰임
  pool.getConnection(function(err, conn) {
    if (err) {
      conn.release();
      throw err;
    }
    const query = `SELECT P.id as product_id, S.quantity, P.name, P.grade, P.weight, P.price_shipping, S.change
    FROM stock as S JOIN product as P ON S.product_id = P.id
    WHERE flag = 'manufacture_produce'
    AND flag_id = ?`;
  
    const exec = conn.query(query, [id], (err, result) => {
      conn.release();
      console.log('실행 sql : ', exec.sql);
      
      return callback(err, result);
    });
  });
}

module.exports.getStockDetail = async (user, data, callback) => {
  let {stockId} = data;
  try{
    const query = `SELECT P.name as productName, S.* FROM \`stock\`
      AS S JOIN \`product\` as P ON S.product_id = P.id
      WHERE S.id = ?
      AND P.user_id = ?
      ORDER BY S.\`id\` DESC`;
    const [rows, fields] = await pool.query(query, [stockId, user.id]);
    console.log('getStockDetail')
    return callback(null, rows);
  }
  catch(error){
    console.log('getStockDetail error')
  }
}

