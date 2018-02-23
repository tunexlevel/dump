else if (path === "/query/pos/sbu") {
    if (user.level < 5) {
        response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
        return response.end();
    }
    
    let list = [];
    let sql, options = [];

    sql = "select sbu, count(sbu) as sbu_count from merchants group by sbu";
    let sbu = yield db.query(sql, options);
    response.write(JSON.stringify({status: 200, list: sbu}));
    return response.end();
}

else if (path === "/query/pos/sbu/transaction") {
    if (user.level < 5) {
        response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
        return response.end();
    }
    
    let list = [];
    let sql, options = [];

    sql = "select sbu, sum(transaction_amount) as t_amount from pos_transaction inner join merchants on pos_transaction.terminal_id = merchants.terminal_id where sbu = $1 and timestamp >= $2 and timestamp <= $3 group by sbu";
    let sbu = yield db.query(sql, options);
    response.write(JSON.stringify({status: 200, list: sbu}));
    return response.end();
}
