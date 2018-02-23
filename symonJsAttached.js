else if (path === "/query/pos/merchant/list") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.code || data.code == "") {
                response.write('{"status": 422, "message": "Please provide a valid [code] of merchant to query."}');
                return response.end();
            }

            let list = [];
            let sql, options = [];

            sql = "SELECT lga, merchant_code, merchant_name, merchant_code_name, merchant_category, back_acc_no, physical_addr, state_code, revenue, merchant_id FROM merchant WHERE merchant_code = $1 ORDER BY merchant_name DESC";
            options = [data.code];
            let merchants = yield db.query(sql, options);
            for (let merchant of merchants.rows) {

                list.push({
                    lga: merchants.lga,
                    merchhant_code: merchants.merchant_code,
                    merchhant_code_name: merchants.merchhant_code_name,
                    merchhant_category: merchants.merchhant_category,
                    back_acc_no: merchants.back_acc_no,
                    merchhant_code: merchants.merchant_code,
                    physical_addr: merchants.physical_addr,
                    merchhant_id: merchants.merchant_id,
                    merchhant_state_code: merchants.merchant_state_code,
                    merchhant_revenue: merchants.merchant_revenue
                });
            }
            response.write(JSON.stringify({status: 200, list: list}));
            return response.end();
        }
        
        else if (path === "/query/pos/merchant") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid [id] of sbu to query."}');
                return response.end();
            }

            let list = [];
            let sql, options = [];

            sql = "select sbu,  merchant_code_name, count(merchant_code_name) from merchants where sbu = $1 group by merchant_code_name,sbu order by merchant_code_name asc";
            options = [data.id];
            let ans = yield db.query(sql, options);
            
            response.write(JSON.stringify({status: 200, list: ans}));
            return response.end();
        }
        
        else if (path === "/query/pos/states") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid [id] of sbu to query."}');
                return response.end();
            }
            else if (!data.code || data.code == "") {
                response.write('{"status": 422, "message": "Please provide a valid [code] of merchant to query."}');
                return response.end();
            }

            let list = [];
            let sql, options = [];

            sql = "select sbu,  merchant_code_name, state_code, count(state_code) from merchants inner join pos on pos.merchant_id=merchants.merchant_id where sbu = $1 and merchant_code_name = $2 group by state_code,merchant_code_name,sbu order by state_code";
            options = [data.id, data.code];
            let ans = yield db.query(sql, options);
            
            response.write(JSON.stringify({status: 200, list: ans}));
            return response.end();
        }
        
        else if (path === "/query/pos/lga") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid [id] of sbu to query."}');
                return response.end();
            }
            else if (!data.code || data.code == "") {
                response.write('{"status": 422, "message": "Please provide a valid [code] of merchant to query."}');
                return response.end();
            }
            else if (!data.state || data.state == "") {
                response.write('{"status": 422, "message": "Please provide a valid [state] of merchant to query."}');
                return response.end();
            }

            let list = [];
            let sql, options = [];

            sql = "select sbu,  merchant_code_name, state_code, lga, count(lga) from merchants inner join pos on pos.merchant_id=merchants.merchant_id where sbu = $1 and merchant_code_name = $2  and state_code = $3 group by lga,state_code,merchant_code_name,sbu order by lga";
            options = [data.id, data.code, data.state];
            let ans = yield db.query(sql, options);
            
            response.write(JSON.stringify({status: 200, list: ans}));
            return response.end();
        }
        
         else if (path === "/query/pos/terminals") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid [id] of sbu to query."}');
                return response.end();
            }
            else if (!data.code || data.code == "") {
                response.write('{"status": 422, "message": "Please provide a valid [code] of merchant to query."}');
                return response.end();
            }
            else if (!data.state || data.state == "") {
                response.write('{"status": 422, "message": "Please provide a valid [state] of merchant to query."}');
                return response.end();
            }
            else if (!data.lga || data.lga == "") {
                response.write('{"status": 422, "message": "Please provide a valid [state] of merchant to query."}');
                return response.end();
            }

            let list = [];
            let sql, options = [];

            sql = "select sbu,  merchant_code_name, terminal_id, merchant_name, state_code, lga, count(terminal_id) from merchants inner join pos on pos.merchant_id=merchants.merchant_id where sbu = $1 and merchant_code_name = $2  and state = $3 and lga = $4 group by terminal_id, lga,state_code,merchant_code_name,sbu order by terminal_id";
            options = [data.id, data.code, data.state, data.lga];
            let ans = yield db.query(sql, options);
            
            response.write(JSON.stringify({status: 200, list: ans}));
            return response.end();
        }
        
        else if (path === "/query/pos/terminal") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid [id] of sbu to query."}');
                return response.end();
            }
            else if (!data.code || data.code == "") {
                response.write('{"status": 422, "message": "Please provide a valid [code] of merchant to query."}');
                return response.end();
            }
            else if (!data.state || data.state == "") {
                response.write('{"status": 422, "message": "Please provide a valid [state] of merchant to query."}');
                return response.end();
            }
            else if (!data.lga || data.lga == "") {
                response.write('{"status": 422, "message": "Please provide a valid [state] of merchant to query."}');
                return response.end();
            }
            else if (!data.terminal || data.terminal == "") {
                response.write('{"status": 422, "message": "Please provide a valid [terminal] of merchant to query."}');
                return response.end();
            }
            let list = [];
            let sql, options = [];

            sql = "select sbu,  merchant_code_name, terminal_id, merchant_name, state_code, lga, count(terminal_id) from merchants inner join pos on pos.merchant_id=merchants.merchant_id where sbu = $1 and merchant_code_name = $2  and state = $3 and lga = $4  and terminal_id = $5 group by terminal_id, lga,state_code,merchant_code_name,sbu";
            options = [data.id, data.code, data.state, data.lga, data.terminal];
            let ans = yield db.query(sql, options);
            
            response.write(JSON.stringify({status: 200, list: ans}));
            return response.end();
        }
