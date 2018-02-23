else if (path === "/query/pos/sbu") {
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

            sql = "select sbu, count(sbu) as sbu_count from merchants group by sbu";
            let sbu = yield db.query(sql, options);
            response.write(JSON.stringify({status: 200, list: sbu}));
            return response.end();
        }
