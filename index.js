const https = require("https");
const http = require("http");
const url = require("url");
const querystring = require("querystring");
const child_process = require("child_process");
const pg = require("pg");
const fs = require("fs");
const co = require("co");
const soap = require("soap");
const parseXML = require("xml2js").parseString;
const aws = require("aws-sdk");
const randomString = require("randomstring");
const watch = require("watch");
const sha1 = require("sha1");
const cron = require("node-cron");
const apn = require("apn");
const gcm = require("node-gcm");
const csv = require("node-csv").createParser();
const moment = require("moment");

let config, policies, db, ses, server, ldap, push;
let IOSPush, ANDROIDPush;

co(function* () {
    let currentProcess = process.argv[2] ? process.argv[2] : "PARENT";
    console.log("******************************\n**      %s PROCESS      **\n******************************", currentProcess);

    console.log("Reading config file...");
    config = yield JSON.parse(fs.readFileSync("config.json", "UTF-8"));
    console.log("OK. Deployment Mode set to", config.env);

    console.log("Connecting to database...");

    pg.types.setTypeParser(1114, function (str) {
        var temp = new Date(str);
        return new Date(Date.UTC(temp.getFullYear(), temp.getMonth(), temp.getHours(), temp.getMinutes(), temp.getSeconds(), temp.getMilliseconds()));
    });
    db = new pg.Pool(config[config.env].db);
    db.on('error', function (err, client) {
        console.error('idle client error', err.message, err.stack);
    });
    if (db) {
        console.log("OK. Connected to database.");
        console.log("Loading application policies...");

        //let policy = yield db.query("SELECT * FROM policies WHERE id=1 LIMIT 1");
        //policies = policy.rows[0];
        policies = config.policies;
        if (!policies) {
            console.log("Error. Couldn't read application policies!");
            process.exit();
        }
        else console.log("OK. Application policies read:", policies);

        sla = yield db.query("SELECT * FROM slaConfig WHERE id=1 LIMIT 1");
        sla = sla.rows[0]

        //fork child process
        console.log("Launching Update Task Process...");

        ses = new aws.SES(config.aws);
        IOSPush = new apn.Provider(config.push.apn);
        ANDROIDPush = new gcm.Sender(config.push.gcm);

        if (currentProcess === "PARENT") {
            child_process.fork(__filename, ['FORKED']);
            console.log("OK. Update Task Process started.");

            if (config.env === "PRODUCTION") {
                let ssl = {
                    key: fs.readFileSync(config.ssl.key),
                    cert: fs.readFileSync(config.ssl.cert)
                };

                server = https.createServer(ssl, launch);
            }
            else server = http.createServer(launch);

            server.listen(config[config.env].port);
            console.log("App running on port", server.address().port);
        }
        else {
            app.launchUpdateSchedule();
            app.launchTransactionUpdateSchedule();
            console.log("DONE. Update Task Processes  running as a child.");
        }
    }
    else {
        console.log("Failed. Unable to connect to database server. Please check ports and try again.");
        process.exit();
    }
})

function launch(request, response) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST");
    response.writeHead(200, {"Content-Type": "text/json"});

    if (request.method !== "POST" && request.method !== "GET") {
        response.write('{"status":403, "message":"Invalid data request protocol."}');
        return response.end();
    }

    let path = url.parse(request.url).pathname;
    let modules = path.split("/");
    let payload = "";

    request.on('data', function (stream) {
        payload += stream;
    });

    request.on('end', function () {
        co(app.route(path, querystring.parse(payload), response, modules)).catch(err => console.log(err.stack));
    });
}

let app = {
    /**
     * @param {String} path        Destination endpoint URI
     * @param {Object} data        POST data payload
     * @param {Object} response    http response object
     * @param {Object} modules     Extra POST/GET parameters
     */

    route: function* (path, data, response, modules) {
        "use strict";

        if (config.env === "DEVEL") console.log("Incoming request:", path, data);

        // Check API access clearance
        let user;

        if (data.oauth) {
            data.oauth = data.oauth.trim();

            let query = yield db.query("SELECT * FROM users WHERE oauth=$1 LIMIT 1", [data.oauth]);
            if (!query.rowCount) {
                response.write('{"status": 403, "message": "Your session has expired. Please login to continue."}');
                return response.end();
            }
            else user = query.rows[0];

            db.query("INSERT INTO trail (user_id, user_name, action) VALUES ($1, $2, $3)", [user.id, user.name, path]);
        }
        else if (data.oauth === config.accessToken) user = {id: "MASTER", level: 5};
        else user = {id: "NOBODY", level: 0};

        // 1. Add admin user

        if (path === "/users/add") {
            if (user.level < 6) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can add users."}');
                return response.end();
            }

            if (!app.isValidEmail(data.email)) {
                response.write('{"status": 422, "message": "Please enter a valid [email] address for this user."}');
                return response.end();
            }
            else if (!data.name || data.name == "") {
                response.write('{"status": 422, "message": "Please enter a valid [name] for this user."}');
                return response.end();
            }
            else if (!app.isDigitsOnly(data.level)) {
                response.write('{"status": 422, "message": "Please enter a valid [level] for this user."}');
                return response.end();
            }
            else if (data.type !== "LOCAL" && data.type !== "LDAP") {
                response.write('{"status": 422, "message": "Please select a valid login [type] for this user."}');
                return response.end();
            }
            else if (!data.assignment || data.assignment == "") {
                response.write('{"status": 422, "message": "Please select a valid [assignment] for this user."}');
                return response.end();
            }
            else if (data.type === "LDAP" && !data.username) {
                response.write('{"status": 422, "message": "Please enter a valid Active Directory [username] for this user."}');
                return response.end();
            }

            data.email = data.email.trim().toLowerCase();
            data.name = app.toTitleCase(data.name.trim());
            data.level = Number(data.level);

            let query = yield db.query("SELECT id FROM users WHERE email=$1", [data.email]);
            if (query.rowCount) {
                response.write(JSON.stringify({
                    status: 403,
                    message: "The email [" + data.email + "] is already profiled for a user."
                }));
                return response.end();
            }

            let oauth = randomString.generate(12);
            let modulus = randomString.generate(12);

            let insert = yield db.query("INSERT INTO users (email, username, oauth, modulus, name, level, type, assignment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                [data.email, data.username, sha1(data.email + oauth + modulus), modulus, data.name, data.level, data.type, data.assignment]);

            if (!insert.rowCount) {
                response.write('{"status": 504, "message": "Error adding user. Please try again."}');
                return response.end();
            }

            let password = (data.type == "LDAP") ? "[Acitve Directory Password]" : oauth;

            app.sendEmail(data.email, "Welcome to Symon ATM View", "Hello, " + data.name.split(" ")[0] + "." +
                "<p>You have been added to ATM View. Now you can monitor ATMs in realtime. Please download the ATM View app here: " + config.appDownload + "</p>" +
                "Access Credentials:<br />" + data.email + "<br />" + password);

            response.write(JSON.stringify({status: 200, message: "New user has been added.", oauth: oauth}));
            return response.end();
        }

        // 2. Bulk upload admin users via CSV

        else if (path === "/users/upload") {
            if (user.level < 6) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can upload users."}');
                return response.end();
            }
            else if (!data.csv || data.csv == "") {
                response.write('{"status": 422, "message": "Please provide a valid [csv] of ATMs to add."}');
                return response.end();
            }

            let list = yield csv.parse(data.csv);
            if (!list.length) {
                response.write(JSON.stringify({status: 503, message: "An error occurred processing CSV."}));
                return response.end();
            }

            let total = list.length;
            if (total < 2) {
                response.write(JSON.stringify({
                    status: 422,
                    message: "The CSV data is empty. Please check and try again."
                }));
                return response.end();
            }

            list.splice(0, 1); // remove labels row

            let added = 0;
            let updated = 0;
            let skipped = 0;
            let errors = 0;

            for (let row of list) {
                if (row.length < 4) {
                    skipped++;
                    errors++;
                    continue;
                }

                let account = [
                    row[0].trim().toLowerCase(), //email
                    row[1].trim().toLowerCase(), //username
                    app.toTitleCase(app.rename(row[2].trim())), //name
                    app.encodeUserLevel(row[3].trim()), //level
                    row[4].trim(), //assignment
                    "LDAP", //type
                    randomString.generate(12), //oauth
                    randomString.generate(12) //modulus
                ];

                let query = yield db.query("SELECT id FROM users WHERE email=$1 LIMIT 1", [account[0]]);
                if (query.rowCount) {
                    account.splice(5, 3);
                    db.query("UPDATE users SET username=$2, name=$3, level=$4, assignment=$5 WHERE email=$1", account);
                    updated++;

                    continue;
                }
                else added++;

                let insert = yield db.query("INSERT INTO users (email, username, name, level, assignment, type, oauth, modulus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", account);
                if (insert.rowCount) {
                    /*app.sendEmail(account[0], "Welcome to Symon ATM View", "Hello, " + account[0].split(" ")[0] + "." +
                        "<p>You have been added to ATM View. Now you can monitor ATMs in realtime. Please download the ATM View app here: " + config.appDownload + "</p>" +
                        "Access Credentials:<br />" + account[0] + "<br />[Acitve Directory Password]");*/
                }
                else errors++;
            }

            response.write(JSON.stringify({
                status: 200,
                added: added,
                skipped: skipped,
                updated: updated,
                errors: errors
            }));
            return response.end();
        }

        // 3. Suspend admin user

        else if (path === "/users/suspend") {
            if (user.level < 6) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can suspend users."}');
                return response.end();
            }

            if (!app.isDigitsOnly(data.id)) {
                response.write('{"status": 422, "message": "Please select a valid user [id] to suspend."}');
                return response.end();
            }

            let query = yield db.query("UPDATE users SET active=$1 WHERE id=$2", [false, Number(data.id)]);
            if (!query.rowCount) {
                response.write('{"status": 504, "message": "Error suspending user. Please try again."}');
                return response.end();
            }

            response.write('{"status": 200, "message": "User has been suspended."}');
            return response.end();
        }

        // 2. Enable admin user

        else if (path === "/users/enable") {
            if (user.level < 6) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can enable users."}');
                return response.end();
            }

            if (!app.isDigitsOnly(data.id)) {
                response.write('{"status": 422, "message": "Please select a valid user [id] to enable."}');
                return response.end();
            }

            let query = yield db.query("UPDATE users SET active=$1 WHERE id=$2", [true, Number(data.id)]);
            if (!query.rowCount) {
                response.write('{"status": 504, "message": "Error enabling user. Please try again."}');
                return response.end();
            }

            response.write('{"status": 200, "message": "User has been enabled."}');
            return response.end();
        }

        // 3. Reassign admin user

        else if (path === "/users/assign") {
            if (user.level < 6) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can assign users."}');
                return response.end();
            }

            if (!app.isDigitsOnly(data.id)) {
                response.write('{"status": 422, "message": "Please select a valid user [id] to assign."}');
                return response.end();
            }
            else if (!app.isDigitsOnly(data.level)) {
                response.write('{"status": 422, "message": "Please select a valid [level] for this user."}');
                return response.end();
            }
            else if (data.level > 1) {
                if (!data.assignment || data.assignment == "") {
                    response.write('{"status": 422, "message": "Please select a valid [assignment] for this user."}');
                    return response.end();
                }
            }

            let query = yield db.query("UPDATE users SET level=$1, assignment=$2 WHERE id=$3", [
                Number(data.level),
                data.assignment,
                Number(data.id)
            ]);

            if (!query.rowCount) {
                response.write('{"status": 504, "message": "Error assigning user. Please try again."}');
                return response.end();
            }

            response.write('{"status": 200, "message": "User has been assigned."}');
            return response.end();
        }

        // 4. Log into admin user

        else if (path === "/users/login") {
            if (!app.isValidEmail(data.email)) {
                response.write('{"status": 422, "message": "Please enter a valid [email] address to login."}');
                return response.end();
            }
            else if (!data.password || data.password == "") {
                response.write('{"status": 442, "message": "Please enter your [password] to login."}');
                return response.end();
            }
            else data.email = data.email.trim().toLowerCase();

            let query = yield db.query("SELECT * FROM users WHERE email=$1 LIMIT 1", [data.email]);
            if (!query.rowCount) {
                response.write('{"status": 404, "message": "User profile not found. Please check your credentials and try again."}');
                return response.end();
            }

            let user = query.rows[0];
            if (!user.active) {
                response.write('{"status": 403, "message": "Your profile is currently suspended. Please contact the system administrator."}');
                return response.end();
            }

            // if user.type is LOCAL do local password login
            if (user.type === "LOCAL") {
                if (sha1(data.email + data.password + user.modulus) === user.oauth) {
                    let modulus = randomString.generate(12);
                    let oauth = sha1(data.email + data.password + modulus);
                    let platform = data.platform || null;
                    let token = data.token || null;

                    let update = yield db.query("UPDATE users SET oauth=$1, modulus=$2, platform=$3, pushToken=$4 WHERE id=$5", [oauth, modulus, platform, token, user.id]);
                    if (!update.rowCount) {
                        response.write('{"status": 500, "message": "An error occurred while trying to login. Please try again."}');
                        return response.end();
                    }

                    db.query("INSERT INTO trail (user_id, action) VALUES ($1, $2)", [user.id, "/users/login"]);

                    response.write(JSON.stringify({
                        status: 200,
                        oauth: oauth,
                        name: user.name,
                        level: app.decodeUserLevel(user.level),
                        assignment: user.assignment,
                        threshold: {up: policies.up, down: policies.down},
                        clearance: user.level,
                        webEnabled: config.webEnabled,
                        sla: sla,
                        message: "The Symon Monitor Web Module is currently not enabled. Please contact Application Support."
                    }));
                    return response.end();
                }
                else {
                    response.write('{"status": 403, "message": "The password you provided is incorrect. Please try again."}');
                    return response.end();
                }
            }

            // Contact LDAP for login

            soap.createClient(config.ldap.url, function (error, client) {
                if (error) {
                    response.write(JSON.stringify({
                        status: 500,
                        message: "We're unable to reach the LDAP server. Please try again in a moment."
                    }));
                    return response.end();
                }

                client.GetADLogon({UserName: user.username, Password: data.password}, function (error, result) {
                    if (error) {
                        response.write(JSON.stringify({
                            status: 500,
                            message: "We're unable to reach the LDAP server right now. Please try again in a moment."
                        }));
                        return response.end();
                    }

                    let status = result.GetADLogonResult.split("~");

                    if (status[0] != "00") {
                        response.write(JSON.stringify({status: 403, message: status[1]}));
                        return response.end();
                    }

                    db.query("INSERT INTO trail (user_id, action) VALUES ($1, $2)", [user.id, "/users/login"]);

                    let oauth = sha1(user.email + randomString.generate());
                    db.query("UPDATE users SET oauth=$1 WHERE id=$2", [oauth, user.id]);

                    response.write(JSON.stringify({
                        status: 200,
                        oauth: oauth,
                        name: user.name,
                        level: app.decodeUserLevel(user.level),
                        assignment: user.assignment,
                        threshold: {up: policies.up, down: policies.down},
                        clearance: user.level,
                        sla: sla,
                        webEnabled: config.webEnabled,
                        message: "The Symon Monitor Web Module is currently not enabled. Please contact Application Support."
                    }));
                    return response.end();
                });
            });
        }

        // 4. Change User Access password

        if (path === "/users/changepassword") {
            if (user.id !== 1) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can change passwords."}');
                return response.end();
            }
            else if (!data.password || data.password == "") {
                response.write('{"status": 442, "message": "Please enter your current [password] to continue."}');
                return response.end();
            }
            else if (!data.newPassword || data.newPassword == "") {
                response.write('{"status": 442, "message": "Please enter your [newPassword] to continue."}');
                return response.end();
            }
            else if (data.newPassword != data.confirmPassword) {
                response.write('{"status": 442, "message": "Your new and confirmation passwords do not match."}');
                return response.end();
            }

            let query = yield db.query("SELECT * FROM users WHERE id=1 LIMIT 1");
            let record = query.rows[0];

            if (sha1(record.email + data.password + record.modulus) === record.oauth) {
                let modulus = randomString.generate(12);
                let oauth = sha1(record.email + data.newPassword + modulus);

                let update = yield db.query("UPDATE users SET oauth=$1, modulus=$2 WHERE id=1", [oauth, modulus]);
                if (!update.rowCount) {
                    response.write('{"status": 500, "message": "An error occurred while changing password. Please try again."}');
                    return response.end();
                }

                response.write(JSON.stringify({status: 200, oauth: oauth}));
                return response.end();
            }
            else {
                response.write('{"status": 403, "message": "The password you provided is incorrect. Please try again."}');
                return response.end();
            }
        }

        // 5. List users

        else if (path === "/users/list") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can list users."}');
                return response.end();
            }

            let people = yield db.query("SELECT id, name, email, level, assignment, type, active FROM users ORDER BY id DESC");

            response.write(JSON.stringify({status: 200, users: people.rows}));
            return response.end();
        }

        // 6. Add new ATMs terminals

        else if (path === "/terminals/add") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can add ATMs."}');
                return response.end();
            }
            else if (!data.csv || data.csv == "") {
                response.write('{"status": 422, "message": "Please provide a valid [csv] of ATMs to add."}');
                return response.end();
            }
            else if (data.policy != "OVERWRITE" && data.policy != "APPEND") {
                response.write('{"status": 422, "message": "Please provide a valid upload [policy] for these ATMs."}');
                return response.end();
            }

            let list = yield csv.parse(data.csv);
            if (!list.length) {
                response.write(JSON.stringify({status: 503, message: "An error occurred processing CSV."}));
                return response.end();
            }

            let total = list.length;
            if (total < 2) {
                response.write(JSON.stringify({
                    status: 422,
                    message: "The CSV data is empty. Please check and try again."
                }));
                return response.end();
            }

            if (data.policy === "OVERWRITE") {
                db.query("DELETE FROM wiphistory");
                yield db.query("DELETE FROM terminals");
            }
            list.splice(0, 1); // remove labels row
            let added = 0;
            let updated = 0;

            for (let item of list) {
                //item.splice(0, 1);  //remove serial number

                // check if terminal is already provisioned
                if (data.policy === "APPEND") {
                    let search = yield db.query("SELECT name FROM terminals WHERE terminal_id=$1 LIMIT 1", [item[0]]);
                    if (search.rowCount) {
                        try {
                            yield db.query("UPDATE terminals SET name=$2, type=$3, make=$4, branch_code=$5, branch_name=$6, zone=$7, subzone=$8, location_name=$9, location_id=$10,designation=$11 WHERE terminal_id=$1", item);
                            updated++;
                        } catch (e) {
                            console.log(e);
                            console.log(item);
                        }
                        continue;
                    }
                    else added++;
                }
                else added++;

                try {
                    yield db.query("INSERT INTO terminals (terminal_id, name, type, make, branch_code, branch_name, zone, subzone, location_name, location_id,designation, availability, balance) " +
                        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11, 0, 0)", item);
                } catch (e) {
                    console.log(e);
                    console.log(item);
                }
            }

            response.write(JSON.stringify({
                status: 200,
                message: "Terminals successfully added.",
                added: added,
                updated: updated,
                skipped: total - added - updated
            }));
            return response.end();
        }

        // 7. Remove ATM terminal

        else if (path === "/terminals/remove") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can remove ATMs."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid terminal [id] of ATM to remove."}');
                return response.end();
            }

            let remove = yield db.query("DELETE FROM terminals WHERE terminal_id=$1", [data.id]);
            response.write(JSON.stringify({
                status: 200,
                message: "Terminal successfully removed.",
                removed: remove.rowCount
            }));
            return response.end();
        }

        // 8. Disable ATM terminal

        else if (path === "/terminals/disable") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can disable ATMs."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid terminal [id] of ATM to disable."}');
                return response.end();
            }
            else if (!data.disable_value) {
                response.write('{"status": 422, "message": "Please enter a valid disable message [id] for this ATM."}');
                return response.end();
            }

            // Add this to the wip history
            // yield db.query("INSERT INTO wiphistory (terminal_id, name, type, make, branch_code, branch_name, zone, subzone, location_name, " +
            //  "location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time) " +
            //  "SELECT terminal_id, name, type, branch_code, branch_name, zone, subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, " +
            //  "disable_value, last_disable_time FROM terminals WHERE terminal_id=$1", [data.id]);

            let update = yield db.query("UPDATE terminals SET is_enabled='0', disable_value=$1, last_disable_time=NOW() WHERE terminal_id=$2",
                [data.disable_value, data.id]);

            yield db.query("INSERT INTO wiphistory (terminal_id, name, type, make, branch_code, branch_name, zone, subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time) " +
                "SELECT terminal_id, name, type, make, branch_code, branch_name, zone, subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time FROM terminals WHERE terminal_id=$1", [data.id]);

            response.write(JSON.stringify({
                status: 200,
                message: "Terminal successfully disabled.",
                count: update.rowCount
            }));
            return response.end();
        }

        else if (path === "/wip/list") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can enable ATMs."}');
                return response.end();
            }
            //let list = yield db.query("SELECT terminal_id, name, availability, last_disable_time, disable_value FROM wiphistory");
            let list = yield db.query("SELECT messages.id, CONCAT_WS (' ', UPPER (messages.message) ) AS reason, terminals.terminal_id, terminals.name, terminals.last_disable_time, " +
                "terminals.availability, terminals.disable_value FROM messages RIGHT JOIN terminals ON " +
                "(messages.id::varchar=terminals.disable_value) WHERE terminals.is_enabled='0'");
            response.write(JSON.stringify({status: 200, list: list.rows}));
            return response.end();
        }

        // 9. Enable ATM terminal

        else if (path === "/terminals/enable") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can enable ATMs."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid terminal [id] of ATM to enable."}');
                return response.end();
            }

            db.query("DELETE FROM wiphistory WHERE terminal_id=$1", [data.id]);

            let update = yield db.query("UPDATE terminals SET is_enabled='1' WHERE terminal_id=$1", [data.id]);
            response.write(JSON.stringify({
                status: 200,
                message: "Terminal successfully enabled.",
                count: update.rowCount
            }));
            return response.end();
        }

        // 10. Override ATM open/close policy

        else if (path === "/terminals/override") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can override ATMs."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid terminal [id] of ATM to override."}');
                return response.end();
            }

            let override = {};

            if (data.open && data.open != "") override.open = data.open;
            if (data.close && data.close != "") override.close = data.close;
            if (data.open && !data.close || data.open >= data.close) {
                response.write('{"status": 422, "message": "The override [close] time must be higher than the [open] time."}');
                return response.end();
            }

            if (data.atmStatus == "1") override.atmStatus = 1;
            if (data.cashLevel == "1") override.cashLevel = 1;
            if (data.cardReader == "1") override.cardReader = 1;
            if (data.cashJam == "1") override.cashJam = 1;

            let update = yield db.query("UPDATE terminals SET override=$1 WHERE terminal_id=$2", [JSON.stringify(override), data.id]);
            if (!update.rowCount) {
                response.write('{"status": 404, "message": "Nothing new to save."}');
                return response.end();
            }

            response.write(JSON.stringify({status: 200, message: "Terminal override successful."}));
            return response.end();
        }

        // 19. List terminals
        else if (path === "/terminals/list") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can list terminals."}');
                return response.end();
            }

            let list;
            if (sla.state == '1') {
                list = yield db.query("SELECT terminal_id, name, sla as availability, health, is_enabled as active FROM terminals");
            } else {
                list = yield db.query("SELECT terminal_id, name, availability, health, is_enabled as active FROM terminals");
            }

            response.write(JSON.stringify({status: 200, list: list.rows}));
            return response.end();
        }

        // 20. List raw terminals
        else if (path === "/terminals/download") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can list terminals."}');
                return response.end();
            }

            let list = yield db.query("SELECT terminal_id, name, type, make, branch_code, branch_name, zone, subzone, location_name, location_id,designation FROM terminals");

            response.write(JSON.stringify({status: 200, list: list.rows}));
            return response.end();
        }
        // 21. List raw terminals
        else if (path === "/users/download") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can list terminals."}');
                return response.end();
            }

            let list = yield db.query("SELECT email, name, level, type, assignment, username FROM users");

            response.write(JSON.stringify({status: 200, list: list.rows}));
            return response.end();
        }

        // 22. Debug terminal

        else if (path === "/terminals/debug") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can debug terminals."}');
                return response.end();
            }
            else if (!data.terminal || data.terminal == "") {
                response.write('{"status": 403, "message": "Please specify the [terminal] to debug."}');
                return response.end();
            }

            let list = [];
            let terminal = yield db.query("SELECT * FROM terminals WHERE terminal_id=$1", [data.terminal]);

            response.write(JSON.stringify({status: 200, terminal: terminal.rows}));
            return response.end();
        }

        // Messages

        else if (path === "/disable/messages/add") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can add Error Messages."}');
                return response.end();
            }
            else if (!data.message || data.message === "") {
                response.write('{"status": 422, "message": "Please provide an error message."}');
                return response.end();
            }
            let insert = yield db.query("INSERT INTO messages (message) VALUES ($1)", [data.message]);

            if (!insert.rowCount) {
                response.write('{"status": 504, "message": "Error adding disable message. Please try again."}');
                return response.end();
            } else {
                response.write('{"status": 200, "message": "Successfully added new disable message."}');
                return response.end();
            }
        }

        else if (path === "/disable/messages/edit") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can remove Error Messages."}');
                return response.end();
            }
            else if (!data.id || data.id === "") {
                response.write('{"status": 422, "message": "Please provide a valid message [id] to update."}');
                return response.end();
            }
            else if (!data.message || data.message === "") {
                response.write('{"status": 422, "message": "Please provide an error message."}');
                return response.end();
            }

            let update = yield db.query("UPDATE messages SET message=$1 WHERE id=$2", [data.message, data.id]);

            if (!update.rowCount) {
                response.write('{"status": 504, "message": "Error updating disable message. Please try again."}');
                return response.end();
            } else {
                response.write('{"status": 200, "message": "Successfully updated disable message."}');
                return response.end();
            }
        }


        else if (path === "/disable/messages/remove") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can remove Error Messages."}');
                return response.end();
            }
            else if (!data.id || data.id === "") {
                response.write('{"status": 422, "message": "Please provide a valid message [id] to remove."}');
                return response.end();
            }

            let remove = yield db.query("DELETE FROM messages WHERE id=$1", [data.id]);
            if (!remove.rowCount) {
                response.write('{"status": 504, "message": "Error deleting message. Please try again."}');
                return response.end();
            } else {
                response.write(JSON.stringify({status: 200, message: "Disable Message successfully deleted."}));
                return response.end();
            }
        }

        else if (path === "/disable/messages/get") {
            let list;

            if (data.id) {
                list = yield db.query("SELECT messages.id, messages.message, terminals.terminal_id, terminals.name, terminals.balance, " +
                    "terminals.location_name, terminals.availability, terminals.health, FROM messages RIGHT JOIN terminals ON " +
                    "(messages.id=terminals.disable_value) WHERE terminals.terminal_id=$1", [data.id]);
            }
            else {
                list = yield db.query("SELECT id, message FROM messages");
            }

            response.write(JSON.stringify({status: 200, list: list.rows}));
            return response.end();
        }

        // SLA

        else if (path === "/sla/config/update") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can modify sla settings."}');
                return response.end();
            }
            else if (!data.time_interval || !data.state) {
                response.write('{"status": 422, "message": "Missing Parameter. Please check back again"}');
                return response.end();
            }

            let update = yield db.query("UPDATE slaConfig SET time_interval=$1, state=$2 WHERE id='1'",
                [data.time_interval, data.state]);


            if (!update.rowCount) {
                response.write('{"status": 504, "message": "Error updating SLA configurations. Please try again."}');
                return response.end();
            } else {
                sla.time_interval = data.time_interval;
                sla.state = data.state;

                // take all terminals to 100% sla
                db.query("UPDATE terminals SET sla='100', last_sla_time=NOW()");

                response.write('{"status": 200, "message": "SLA Configurations updated."}');
                return response.end();
            }
        }

        else if (path === "/sla/get") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can check sla settings."}');
                return response.end();
            }
            response.write(JSON.stringify({status: 200, message: sla}));
            return response.end();
        }

        // Flags

        else if (path === "/terminals/flags/update") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can enable flags."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid terminal [id] of ATM to enable flag."}');
                return response.end();
            }
            else if (!data.cash_status || !data.cash_jam || !data.card_reader) {
                response.write('{"status": 422, "message": "Missing Flag. Please check back again"}');
                return response.end();
            }

            let update = yield db.query("UPDATE terminals SET cash_status_flag=$1, cash_jam_flag=$2, card_reader_flag=$3 WHERE terminal_id=$4",
                [data.cash_status, data.cash_jam, data.card_reader, data.id]);

            if (!update.rowCount) {
                response.write('{"status": 504, "message": "Error updating terminal flags. Please try again."}');
                return response.end();
            } else {
                response.write('{"status": 200, "message": "Flag(s) updated for this terminal."}');
                return response.end();
            }
        }


        else if (path === "/terminals/flags/status") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can check flags state."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid terminal [id] of ATM to check flags."}');
                return response.end();
            }

            let list = yield db.query("SELECT cash_status_flag, cash_jam_flag, card_reader_flag FROM terminals WHERE terminal_id=$1", [data.id]);
            if (!list.rowCount) {
                response.write('{"status": 504, "message": "Error checking state of flags for terminal. Please try again."}');
                return response.end();
            } else {
                response.write(JSON.stringify({status: 200, list: list.rows[0]}));
                return response.end();
            }
        }

        else if (path === "/all/summary") {
            // if (user.level < 1) {
            //  response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
            //  return response.end();
            // }

            // AND card_reader_status = 'OK'

            let query = yield db.query("SELECT " +
                "SUM(CASE WHEN is_enabled='1' then 1 else 0 end) as total, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND (atm_status = 'IN-SERVICE' OR atm_status = 'SUPERVISOR') AND cash_jam_status = 'NO CASH JAM' then 1 else 0 end) as dispensing, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND atm_status = 'SUPERVISOR' then 1 else 0 end) as supervisor, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND atm_status = 'OFFLINE' then 1 else 0 end) as offline, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND atm_status = 'CLOSED' then 1 else 0 end) as closed, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND atm_status = 'IN-SERVICE' then 1 else 0 end) as in_service, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND cash_status = 'CASH OUT' then 1 else 0 end) as cash_out, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND cash_jam_status = 'CASH JAM' then 1 else 0 end) as cash_jam, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' then sla end) as sla, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' then availability end) as availability " +
                "FROM terminals");

            if (!query.rowCount) {
                response.write('{"status": 504, "message": "Error getting summary. Please try again."}');
                return response.end();
            }
            let status = query.rows[0];

            let availability = sla.state == '1' ? Math.round(status.sla / status.total) :
                Math.round(status.availability / status.total);
            let dispensing = Math.round(status.dispensing / status.total * 100);

            response.write(JSON.stringify({
                status: 200,
                availability: availability,
                total: status.total,
                supervisor: status.supervisor,
                offline: status.offline,
                closed: status.closed,
                in_service: status.in_service,
                cash_out: status.cash_out,
                cash_jam: status.cash_jam,
                dispensing: status.dispensing,
                non_dispensing: status.total - status.dispensing,
                dispensing_percent: dispensing,
                non_dispensing_percent: 100 - dispensing
            }));
            return response.end();

        }

        // Query
        else if (path === "/query/terminals/disabled") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }

            let list = db.query("SELECT terminal_id, name, type, make, branch_code, branch_name, zone, last_healthy_time as up, last_issue_time as down, last_updated, last_disable_time, subzone, location_name, location_id FROM terminals WHERE is_enabled='0'");

            if (!list.rowCount) {
                response.write('{"status": 504, "message": "Error getting list of disabled terminals. Please try again."}');
                return response.end();
            } else {
                response.write(JSON.stringify({status: 200, list: list.rows}));
                return response.end();
            }

        }

        // 11. Query Domain status

        else if (path === "/query/domain") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }

            let domain = yield app.getDomainStatus();
            let nou = yield  app.getDomainTransactions(1);
            let all = yield  app.getDomainTransactions(2);

            let zones = [];

            let list = yield db.query("SELECT DISTINCT(zone) FROM terminals ORDER BY zone ASC");

            for (let zone of list.rows) {
                let status = yield app.getZoneStatus(zone.zone);


                zones.push({
                    id: zone.zone,
                    name: zone.zone,
                    availability: status.availability,
                    atms: status.atms,
                    up: status.up,
                    down: status.down
                });
            }

            response.write(JSON.stringify({
                status: 200,
                title: "BANKWIDE",
                level: "domain",
                summary: domain,
                list: zones,
                transactions: {
                    nou: nou, all: all
                }

            }));
            return response.end();
        }



        // 12. Query Zone status

        else if (path === "/query/zone") {
            if (user.level < 4) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.zone || data.zone == "") {
                response.write('{"status": 422, "message": "Please provide a valid [zone] of ATMs to query."}');
                return response.end();
            }

            let zone = yield app.getZoneStatus(data.zone);
            let nou = yield  app.getZoneTransactions(data.zone, 1);
            let all = yield  app.getZoneTransactions(data.zone, 2);
            if (!zone) {
                response.write('{"status": 500, "message": "This zone currently has no history and cannot be viewed."}');
                return response.end();
            }

            let subzones = [];
            let list = yield db.query("SELECT DISTINCT(subzone) FROM terminals WHERE zone=$1 ORDER BY subzone ASC", [data.zone]);

            for (let subzone of list.rows) {
                let status = yield app.getSubzoneStatus(subzone.subzone);

                subzones.push({
                    id: subzone.subzone,
                    name: subzone.subzone,
                    availability: status.availability,
                    atms: status.atms,
                    up: status.up,
                    down: status.down
                });
            }

            response.write(JSON.stringify({
                status: 200,
                title: data.zone,
                level: "zone",
                summary: zone,
                list: subzones,
                transactions: {
                    nou: nou, all: all
                }
            }));
            return response.end();
        }

        // 13. Query Subzone status

        else if (path === "/query/subzone") {
            if (user.level < 3) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.subzone || data.subzone == "") {
                response.write('{"status": 422, "message": "Please provide a valid [subzone] of ATMs to query."}');
                return response.end();
            }

            let subzone = yield app.getSubzoneStatus(data.subzone);
            let nou = yield  app.getSubZoneTransactions(data.subzone, 1);
            let all = yield  app.getSubZoneTransactions(data.subzone, 2);
            if (!subzone) {
                response.write('{"status": 500, "message": "This subzone currently has no history and cannot be viewed."}');
                return response.end();
            }

            let branches = [];
            let list = yield db.query("SELECT DISTINCT(branch_code), branch_name FROM terminals WHERE subzone=$1 ORDER BY branch_name ASC", [data.subzone]);

            for (let branch of list.rows) {
                let status = yield app.getBranchStatus(branch.branch_code);

                branches.push({
                    id: branch.branch_code,
                    name: branch.branch_name,
                    availability: status.availability,
                    atms: status.atms,
                    up: status.up,
                    down: status.down
                });
            }

            response.write(JSON.stringify({
                status: 200,
                title: data.subzone,
                level: "subzone",
                summary: subzone,
                list: branches,
                transactions: {
                    nou: nou, all: all
                }
            }));
            return response.end();
        }

        // 14. Query Branch status

        else if (path === "/query/branch") {
            if (user.level < 2) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.branch || data.branch == "") {
                response.write('{"status": 422, "message": "Please provide a valid [branch] of ATMs to query."}');
                return response.end();
            }

            let branch = yield app.getBranchStatus(data.branch);
            let nou = yield  app.getBranchTransactions(data.branch, 1);
            let all = yield  app.getBranchTransactions(data.branch, 2);
            if (!branch) {
                response.write('{"status": 500, "message": "This branch currently has no history and cannot be viewed."}');
                return response.end();
            }

            let locations = [];
            let list = yield db.query("SELECT DISTINCT(location_id), location_name, branch_name FROM terminals WHERE branch_code=$1 AND is_enabled='1' ORDER BY location_name ASC", [data.branch]);
            for (let location of list.rows) {
                let status = yield app.getLocationStatus(location.location_id);

                locations.push({
                    id: location.location_id,
                    name: location.location_name,
                    availability: status.availability,
                    atms: status.atms,
                    up: status.up,
                    down: status.down
                });
            }

            response.write(JSON.stringify({
                status: 200,
                title: list.rows[0].branch_name,
                level: "branch",
                summary: branch,
                list: locations,
                transactions: {
                    nou: nou, all: all
                }
            }));
            return response.end();
        }

        // 19.2 get branches summary
        else if (path === "/branches/summary") {
            let average = 0;

            let locations = [];
            let list = yield db.query(" SELECT DISTINCT(location_id), location_name, branch_name, zone, subzone, location_name FROM terminals WHERE is_enabled='1' ORDER BY location_name ASC");
            for (let location of list.rows) {
                let status = yield app.getLocationStatus(location.location_id);


                locations.push({
                    location_name: location.location_name,
                    terminal_count: status.terminal_count,
                    branch_name: location.branch_name,
                    availability: status.availability,
                    zone: location.zone,
                    subzone: location.subzone,

                });

                average += status.availability;
            }

            let total = Math.round(average / locations.length);
            response.write(JSON.stringify({status: 200, list: locations, average: total}));
            return response.end();
        }


        // 15. Query Location status

        else if (path === "/query/location") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.location || data.location == "") {
                response.write('{"status": 422, "message": "Please provide a valid [location] of ATMs to query."}');
                return response.end();
            }

            let status = yield app.getLocationStatus(data.location);
            let nou = yield  app.getLocationTransactions(data.location, 1);
            let all = yield  app.getLocationTransactions(data.location, 2);
            if (!status) {
                response.write('{"status": 500, "message": "This location currently has no history and cannot be viewed."}');
                return response.end();
            }

            let terminals = [];
            let list = yield db.query("SELECT terminal_id, name, balance, location_name, availability, sla, health FROM terminals WHERE location_id=$1 AND is_enabled='1' ORDER BY name ASC", [data.location]);

            if (!list.rowCount) {
                response.write(JSON.stringify({
                    status: 404,
                    message: "There's currently no commissioned ATM in this location."
                }));
                return response.end();
            }

            for (let terminal of list.rows) {
                terminals.push({
                    id: terminal.terminal_id,
                    name: terminal.name,
                    availability: sla.state == '0' ? Math.round(terminal.availability) : Math.round(terminal.sla),
                    sla: Math.round(terminal.sla),
                    balance: terminal.balance,
                    health: terminal.health
                });
            }

            response.write(JSON.stringify({
                status: 200,
                title: list.rows[0].location_name,
                level: "location",
                summary: status,
                list: terminals,
                transactions: {all: all, nou: nou}
            }));
            return response.end();
        }

        // 16. Query Terminal status

        else if (path === "/query/terminal") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.terminal || data.terminal == "") {
                response.write('{"status": 422, "message": "Please provide a valid [terminal] of the ATM to query."}');
                return response.end();
            }

            let status = yield app.getTerminalStatus(data.terminal);
            let nou = yield app.getTerminalTransactions(data.terminal, 1);
            let all = yield app.getTerminalTransactions(data.terminal, 2);

            if (!status) {
                response.write('{"status": 500, "message": "This terminal currently has no history and cannot be viewed."}');
                return response.end();
            }

            let updates = [];

            // compare with previous update when saving new update
            // create exception column to specify what changed

            /*let list = yield db.query("SELECT w1.id, w1.exception, w1.terminal_id, w1.atm_status, w1.cash_status, w1.cash_jam, w1.card_reader, w1.timestamp " +
                "FROM (SELECT w2.id, w2.exception, w2.terminal_id, w2.atm_status, w2.cash_status, w2.cash_jam, w2.card_reader, w2.timestamp, " +
                "lead (w2.exception) OVER (ORDER BY w2.id DESC) as prev_exception FROM updates w2 ORDER BY w2.id DESC) as w1 " +
            "WHERE w1.exception IS DISTINCT FROM w1.prev_exception AND w1.terminal_id=$1 " +
            "ORDER BY w1.id DESC LIMIT 10", [data.terminal]);*/

            let list = yield db.query("SELECT id, exception, terminal_id, atm_status, cash_status, cash_jam, card_reader, timestamp FROM updates WHERE terminal_id=$1 " +
                "ORDER BY id DESC LIMIT 10", [data.terminal]);

            for (let row of list.rows) {
                let duration = "";
                if (!updates.length) duration = " — " + ((status.health >= 1) ? "Up for <b>" + app.calculateDuration(status.up) + "</b>" :
                    "Down for <b>" + app.calculateDuration(status.down) + "</b>");

                updates.push({
                    id: row.id,
                    atm_status: row.atm_status,
                    cash_level: row.cash_level,
                    cash_status: row.cash_status,
                    cash_jam: row.cash_jam,
                    card_reader: row.card_reader,
                    exception: app.decodeStatusException(row.exception, row.atm_status, row.cash_status),
                    time: app.formatDate(row.timestamp) + duration
                });
            }

            response.write(JSON.stringify({
                status: 200, title: status.name, level: "terminal", summary: status, list: updates, transactions: {
                    all: all, nou: nou
                }
            }));
            return response.end();
        }

        // 17. Get Up/Down Terminals

        else if (path === "/query/updown") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid [id] of ATMs to query."}');
                return response.end();
            }
            else if (!data.level || data.level == "") {
                response.write('{"status": 422, "message": "Please provide a valid [level] of ATMs to query."}');
                return response.end();
            }
            else if (data.direction != "UP" && data.direction != "DOWN" && data.direction != "ALL") {
                response.write('{"status": 422, "message": "Please provide a valid [direction] of ATMs to query."}');
                return response.end();
            }

            let queryCondition = "";
            if (data.direction == "UP") queryCondition = " AND health >=1";
            else if (data.direction == "DOWN") queryCondition = " AND health=0";

            let list;

            if (data.level === "domain") {
                list = yield db.query("SELECT terminal_id, name, availability, health, last_healthy_time, last_issue_time FROM terminals WHERE is_enabled='1' " +
                    queryCondition + " ORDER BY name ASC");
            }
            else {
                let sql = "SELECT terminal_id, name, availability, health, last_healthy_time, last_issue_time FROM terminals WHERE " + data.level + "=$1 AND is_enabled='1' " +
                    queryCondition + " ORDER BY name ASC";

                list = yield db.query(sql, [data.id]);
            }

            let terminals = [];
            list = list.rows;

            for (let terminal of list) {
                let timestamp = (data.direction === "UP") ? terminal.last_healthy_time : terminal.last_issue_time;

                terminals.push({
                    id: terminal.terminal_id,
                    name: terminal.name,
                    availability: terminal.availability,
                    lastUpdated: app.calculateDuration(timestamp, true),
                    health: terminal.health,
                    timestamp: new Date(timestamp).getTime()
                });
            }

            response.write(JSON.stringify({
                status: 200,
                title: data.id,
                count: list.length,
                level: data.level,
                list: terminals
            }));
            return response.end();
        }
        else if (path === "/query/pos/domain") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query pos."}');
                return response.end();
            }
            let sql = "select sum(1) as count, pos_terminals.state_code from merchants inner join pos_terminals on merchants.merchant_id=pos_terminals.merchant_id group by pos_terminals.state_code";
            let list = yield db.query(sql);


            response.write(JSON.stringify({
                status: 200,
                list: list.rows
            }));
            return response.end();
        }
        else if (path === "/query/pos/merchants") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query pos."}');
                return response.end();
            }
            let sql = "SELECT merchant_code,sum(1) as merchant_count,merchant_code_name FROM public.merchants group by merchant_code,merchant_code_name";
            let list = yield db.query(sql);


            response.write(JSON.stringify({
                status: 200,
                list: list.rows
            }));
            return response.end();
        }
        else if (path === "/query/pos/merchant/states") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query pos."}');
                return response.end();
            }
            else if (!data.merchant_code) {
                response.write('{"status": 422, "message": "Please provide a valid [merchant_code] of POS to query."}');
                return response.end();
            }
            let sql = "SELECT sum(1) as count, merchants.merchant_code,state_code FROM public.merchants inner join pos_terminals on merchants.merchant_id=pos_terminals.merchant_id where merchants.merchant_code=$1 group by state_code,merchants.merchant_code,state_code";
            let list = yield db.query(sql,[data.merchant_code]);


            response.write(JSON.stringify({
                status: 200,
                merchant:yield app.getMerchantInfo(data.merchant_code),
                list: list.rows
            }));
            return response.end();
        }
        else if (path === "/query/pos/merchant/lga") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query pos."}');
                return response.end();
            }
            else if (!data.merchant_code) {
                response.write('{"status": 422, "message": "Please provide a valid [merchant_code] of POS to query."}');
                return response.end();
            }
            else if (!data.state_code) {
                response.write('{"status": 422, "message": "Please provide a valid [state] of POS to query."}');
                return response.end();
            }
            let sql = "SELECT sum(1) as count, merchants.merchant_code,merchant_name,lga FROM public.merchants " +
                "inner join pos_terminals on merchants.merchant_id=pos_terminals.merchant_id " +
                "where merchants.merchant_code=$1 and state_code=$2  group by merchants.merchant_code,lga,merchant_name  ";
            let list = yield db.query(sql,[data.merchant_code,data.state_code]);


            response.write(JSON.stringify({
                status: 200,
                merchant:yield app.getMerchantInfo(data.merchant_code),
                list: list.rows
            }));
            return response.end();
        }
        else if (path === "/query/pos/merchant/location") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query pos."}');
                return response.end();
            }
            else if (!data.merchant_code) {
                response.write('{"status": 422, "message": "Please provide a valid [merchant_code] of POS to query."}');
                return response.end();
            }
            else if (!data.location) {
                response.write('{"status": 422, "message": "Please provide a valid [location] of POS to query."}');
                return response.end();
            }
            else if (!data.lga) {
                response.write('{"status": 422, "message": "Please provide a valid [lga] of POS to query."}');
                return response.end();
            }
            let sql = "select pos_terminals.terminal_id,pos_terminals.account_number,merchants.merchant_id from merchants" +
                "   inner join pos_terminals on pos_terminals.merchant_id=merchants.merchant_id " +
                "where merchants.merchant_code=$1 and merchant_name=$2 and lga=$3  ";
            let list = yield db.query(sql,[data.merchant_code,data.location,data.lga]);


            response.write(JSON.stringify({
                status: 200,
                merchant:yield app.getMerchantInfo(data.merchant_code),
                list: list.rows
            }));
            return response.end();
        }
        else if (path === "/query/pos/merchant/unit") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query pos."}');
                return response.end();
            }
            else if (!data.terminal_id) {
                response.write('{"status": 422, "message": "Please provide a valid [terminal_id] of POS to query."}');
                return response.end();
            }



            response.write(JSON.stringify({
                status: 200,
                merchant:yield app.getPosInfo(data.terminal_id)

            }));
            return response.end();
        }
        else if (path === "/query/pos/state") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query pos."}');
                return response.end();
            }

            else if (!data.state) {
                response.write('{"status": 422, "message": "Please provide a valid [lga] of POS to query."}');
                return response.end();
            }
            console.log(data.state);
            let sql = "select sum(1) as count,merchants.merchant_code, merchants.merchant_code_name from merchants inner join pos_terminals on merchants.merchant_id=pos_terminals.merchant_id " +
                "where state_code=$1 group by merchants.merchant_code,merchants.merchant_code_name"
            let list = yield db.query(sql, [data.state]);


            response.write(JSON.stringify({
                status: 200,
                list: list.rows
            }));
            return response.end();
        }
        else if (path === "/query/pos/merchant") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query pos."}');
                return response.end();
            }

            else if (!data.merchant_id) {
                response.write('{"status": 422, "message": "Please provide a valid [merchant_id] of POS to query."}');
                return response.end();
            }

            let sql = "select merchants.merchant_name, merchants.merchant_id, merchants.merchant_code_name, pos_terminals.lga,pos_terminals.state_code" +
                " from merchants inner join pos_terminals on merchants.merchant_id=pos_terminals.merchant_id where merchant_code=$1 ";
            let list = yield db.query(sql, [data.merchant_id]);


            response.write(JSON.stringify({
                status: 200,
                list: list.rows
            }));
            return response.end();
        }

        // 18. Query List of Issues

        else if (path === "/query/issues") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid [id] of ATMs to query."}');
                return response.end();
            }
            else if (!data.level || data.level == "") {
                response.write('{"status": 422, "message": "Please provide a valid [level] of ATMs to query."}');
                return response.end();
            }

            let list;
            let sql, options = [];

            if (data.level === "domain") {
                sql = "SELECT " +
                    "SUM(CASE WHEN is_enabled='1' AND atm_status = 'OFFLINE' then 1 else 0 end) as atm_status_offline, " +
                    "SUM(CASE WHEN is_enabled='1' AND atm_status = 'SUPERVISOR' then 1 else 0 end) as atm_status_supervisor, " +
                    "SUM(CASE WHEN is_enabled='1' AND atm_status = 'CLOSED' then 1 else 0 end) as atm_status_closed, " +
                    "SUM(CASE WHEN is_enabled='1' AND cash_status = 'CASH OUT' then 1 else 0 end) as cash_out, " +
                    "SUM(CASE WHEN is_enabled='1' AND cash_jam_status = 'CASH JAM' then 1 else 0 end) as cash_jam_status, " +
                    "SUM(CASE WHEN is_enabled='1' AND card_reader_status = 'FAULTY' then 1 else 0 end) as card_reader_faulty " +
                    "FROM terminals";
            }
            else {
                sql = "SELECT " +
                    "SUM(CASE WHEN is_enabled='1' AND atm_status = 'OFFLINE' AND " + data.level + "=$1 then 1 else 0 end) as atm_status_offline, " +
                    "SUM(CASE WHEN is_enabled='1' AND atm_status = 'SUPERVISOR' AND " + data.level + "=$1 then 1 else 0 end) as atm_status_supervisor, " +
                    "SUM(CASE WHEN is_enabled='1' AND atm_status = 'CLOSED' AND " + data.level + "=$1 then 1 else 0 end) as atm_status_closed, " +
                    "SUM(CASE WHEN is_enabled='1' AND cash_status = 'CASH OUT' AND " + data.level + "=$1 then 1 else 0 end) as cash_out, " +
                    "SUM(CASE WHEN is_enabled='1' AND cash_jam_status = 'CASH JAM' AND " + data.level + "=$1 then 1 else 0 end) as cash_jam_status, " +
                    "SUM(CASE WHEN is_enabled='1' AND card_reader_status = 'FAULTY' AND " + data.level + "=$1 then 1 else 0 end) as card_reader_faulty " +
                    "FROM terminals";

                options = [data.id];
            }

            list = yield db.query(sql, options);

            response.write(JSON.stringify({status: 200, title: data.id, issues: list.rows[0]}));
            return response.end();
        }

        // 18. Query List of Issues

        else if (path === "/query/issues/list") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Access denied. You MUST login to query terminals."}');
                return response.end();
            }
            else if (!data.id || data.id == "") {
                response.write('{"status": 422, "message": "Please provide a valid [id] of ATMs to query."}');
                return response.end();
            }
            else if (!data.level || data.level == "") {
                response.write('{"status": 422, "message": "Please provide a valid [level] of ATMs to query."}');
                return response.end();
            }
            else if (!data.issue || data.issue == "") {
                response.write('{"status": 422, "message": "Please provide a valid [issue] of ATMs to query."}');
                return response.end();
            }
            else if (!data.status || data.status == "") {
                response.write('{"status": 422, "message": "Please provide a valid [status] of ATMs to query."}');
                return response.end();
            }

            let list = [];
            let sql, options = [];

            if (data.level === "domain") {
                sql = "SELECT terminal_id, name, availability, health, last_healthy_time, last_issue_time FROM terminals WHERE " + data.issue + "=$1 AND is_enabled='1'";
                options = [data.status];
            }
            else {
                sql = "SELECT terminal_id, name, availability, health, last_healthy_time, last_issue_time FROM terminals WHERE " + data.level + "=$1 AND " + data.issue + "=$2 AND is_enabled='1'";
                options = [data.id, data.status];
            }

            let terminals = yield db.query(sql, options);
            for (let terminal of terminals.rows) {
                let timestamp = (data.direction === "UP") ? terminal.last_healthy_time : terminal.last_issue_time;

                list.push({
                    id: terminal.terminal_id,
                    name: terminal.name,
                    availability: terminal.availability,
                    lastUpdated: app.calculateDuration(timestamp, true),
                    health: terminal.health,
                    timestamp: new Date(timestamp).getTime()
                });
            }

            response.write(JSON.stringify({status: 200, list: list}));
            return response.end();
        }


        // 20. Update PUSH notification token

        else if (path === "/push/updatetoken") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Your session has expired. Please login again."}');
                return response.end();
            }
            else if (data.platform != "ANDROID" && data.platform != "IOS") {
                response.write('{"status": 403, "message": "Unsupported platform encountered."}');
                return response.end();
            }
            else if (!data.token || data.token == "") {
                response.write('{"status": 403, "message": "Please supply a valid registrationId."}');
                return response.end();
            }

            db.query("UPDATE users SET platform=$1, pushtoken=$2 WHERE id=$3", [data.platform, data.token, user.id]);

            response.write('{"status": 200, "message": "Loaded user settings."}');
            return response.end();
        }

        // 21. Remove PUSH notification token --> Logout

        else if (path === "/push/removetoken") {
            if (user.level < 1) {
                response.write('{"status": 403, "message": "Your session has expired. Please login again."}');
                return response.end();
            }

            db.query("UPDATE users SET platform='', pushtoken='' WHERE id=$1", [user.id]);

            response.write('{"status": 200, "message": "Logout successful."}');
            return response.end();
        }

        else if (path === "/push/broadcast") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can send PUSH Notifications."}');
                return response.end();
            }
            else if (!data.message || data.message == "") {
                response.write('{"status": 442, "message": "Please provide a valid [message] to send."}');
                return response.end();
            }
            else if (data.mode != "GO" && data.mode != "NO") {
                response.write('{"status": 442, "message": "Please provide a valid [mode] of operation."}');
                return response.end();
            }

            let android = [];
            let ios = [];
            let broadcastCounter = 0;
            let devices = yield db.query("SELECT platform, pushtoken FROM users");

            for (let device of devices.rows) {
                if (device.platform === "ANDROID") android.push(device.pushtoken);
                else if (device.platform === "IOS") ios.push(device.pushtoken);

                if (device.platform === "ANDROID" || device.platform === "IOS") broadcastCounter++;
            }

            if (data.mode === "GO") {
                app.sendANDROIDPush(android, "Admin Broadcast", message);
                app.sendIOSPush(ios, "Admin Broadcast", message);
            }
            else if (data.mode === "NO") {
                console.log(android);
                console.log(ios);
            }

            response.write('{"status": 200, "mode": "' + data.mode + '", "message": "Broadcast PUSH Notification sent to ' + app.isPlural(broadcastCounter, "user") + '"}');
            return response.end();
        }
        else if (path === "/query/custom") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can do that."}');
                return response.end();
            }
            else if (!data.query ) {
                response.write('{"status": 422, "message": "Please provide a valid query to analyze."}');
                return response.end();
            }

            let sql= data.query;
            let result;
            if(data.params){
                let params= data.params.split(',');
                if(params.length >0){
                  result=  yield db.query(sql, params);
                }
            }
            else {
               result= yield db.query(sql);
               if (result.rows){
                   result= result.rows;
               }
            }
            response.write(JSON.stringify({status: 200, result: result}));
            return response.end();
        }
        else if (path === "/analytics/summary") {
            if (user.level < 5) {
                response.write('{"status": 403, "message": "Access denied. Only Access Manager can send PUSH Notifications."}');
                return response.end();
            }
            else if (!data.level || data.level == "") {
                response.write('{"status": 422, "message": "Please provide a valid [level] of ATMs to analyze."}');
                return response.end();
            }
            else if (data.level === "domain" && !data.id) {
                response.write('{"status": 422, "message": "Please provide a valid [id] of ATMs to analyze."}');
                return response.end();
            }


            let sql;
            let options = [];

            for (let i = 1; i < 8; i++) {
                options.push(moment().subtract(i, 'days').format("YYYY-MM-DD"), moment().subtract(i, 'days').format("ddd"));
            }

            if (data.level === "domain") {
                sql = "SELECT ROUND(AVG(CASE WHEN timestamp=$1 THEN availability end)) as $2 " +
                    "ROUND(AVG(CASE WHEN timestamp=$3 THEN availability end)) as $4 " +
                    "ROUND(AVG(CASE WHEN timestamp=$5 THEN availability end)) as $6 " +
                    "ROUND(AVG(CASE WHEN timestamp=$7 THEN availability end)) as $8 " +
                    "ROUND(AVG(CASE WHEN timestamp=$5 THEN availability end)) as $10 " +
                    "ROUND(AVG(CASE WHEN timestamp=$9 THEN availability end)) as $12 " +
                    "ROUND(AVG(CASE WHEN timestamp=$11 THEN availability end)) as $14 " +
                    "FROM terminals";
            }
            else sql = "";

            let history = yield db.query(sql, options);

            response.write(JSON.stringify({status: 200, history: history}));
            return response.end();
        }


        else if (path === "/analytics/range") {
            if (!data.start) {
                response.write('{"status": 422, "message": "Please provide a start time to query."}');
                return response.end();
            }
            else if (!data.end) {
                response.write('{"status": 422, "message": "Please provide a end time to query."}');
                return response.end();
            }
            else if (data.type !== "regulatory" && data.type !== "internal") {
                response.write('{"status": 422, "message": "Please provide a valid type to query for"}');
                return response.end();
            }
            let switcher = "";
            if (data.start === data.end) {
                switcher = " + '1 day' :: interval "
            }
            // data.start = data.start;
            // data.end = data.end;

            // let exception = yield db.query("SELECT terminal_id, exception, timestamp, COUNT (exception) FROM updates " +
            //  "GROUP BY terminal_id, exception, timestamp HAVING timestamp>=$1 AND timestamp<=$2", [data.start, data.end])
            // console.log(exception)

            let sql = data.type === "regulatory" ?
                "SELECT distinct history.timestamp, history.terminal_id,ROUND(history.sla) as availability, " +
                "terminals.name, history.branch_name,history.branch_code,history.zone,history.subzone FROM history inner join terminals on " +
                "(history.terminal_id=terminals.terminal_id) where " +
                "history.timestamp >=($1:: date) and history.timestamp < ($2:: date " + switcher + ")" +
                " and terminals.is_enabled='1'"
                :
                "SELECT distinct history.timestamp, history.terminal_id,ROUND(history.availability) as availability, " +
                "terminals.name, history.branch_name,history.branch_code,history.zone,history.subzone FROM history inner join terminals on " +
                "(history.terminal_id=terminals.terminal_id) where " +
                "history.timestamp >=($1:: date) and history.timestamp < ($2:: date " + switcher + ")" +
                " and terminals.is_enabled='1'";
            console.log(sql);
            let history = yield db.query(sql, [data.start, data.end])


            response.write(JSON.stringify({status: 200, history: history.rows}));
            return response.end();

        }


        // Bulk upload atm's history

        else if (path === "/history/upload") {
            // if (user.level < 6) {
            //  response.write('{"status": 403, "message": "Access denied. Only Access Manager can upload ATM History."}');
            //  return response.end();
            // }
            // if (!data.csv || data == "") {
            //  response.write('{"status": 422, "message": "Please provide a valid [csv] of ATMs to add."}');
            //  return response.end();
            // }

            let list = yield csv.parse(data.csv);
            if (!list.length) {
                response.write(JSON.stringify({status: 503, message: "An error occurred processing CSV."}));
                return response.end();
            }

            let total = list.length;
            if (total < 2) {
                response.write(JSON.stringify({
                    status: 422,
                    message: "The CSV data is empty. Please check and try again."
                }));
                return response.end();
            }

            let days = list.splice(0, 1);
            days = days[0];
            // remove the row labels marker
            days.splice(0, 1);
            // convert dates to sql dates
            days = days.map(day => {
                let e = day.split("/");
                let f = `${e[2]}-`;
                f += e[0].length === 1 ? `0${e[0]}-` : `${e[0]}-`;
                f += e[1].length === 1 ? `0${e[1]}` : `${e[1]}`;
                return f;
            })
            for (let item of list) {
                let terminal = item.splice(0, 1)[0];
                let query = yield db.query("SELECT terminal_id, branch_code, branch_name, zone, subzone, location_id FROM terminals " +
                    "WHERE terminal_id=$1", [terminal])
                if (query.rows[0]) {
                    query = query.rows[0];
                    for (let i = 0; i < item.length; i++) {
                        let availability = item[i]
                        let date = days[i]

                        db.query("INSERT INTO cbn_history (terminal_id, branch_code, branch_name, zone, subzone, location_id, availability, timestamp) " +
                            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [query.terminal_id, query.branch_code, query.branch_name, query.zone, query.subzone, query.location_id, availability, date]);
                    }
                }
            }

            response.write(JSON.stringify({status: 200, message: "History terminals likely added."}));
            return response.end();
        }

        //else {
        //  response.write('{"status": 404, "message": "Endpoint not implemented."}');
        //  return response.end();
        //}
    },

    getDomainStatus: function* () {
        "use strict";

        if (sla.state == 1) {
            let query = yield db.query("SELECT " +
                "SUM(CASE WHEN is_enabled='1' then 1 else 0 end) as total, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health >= 1 then 1 else 0 end) as up, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health = 0 then 1 else 0 end) as down, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' then sla end) as sla " +
                "FROM terminals");

            if (!query.rowCount) return false;
            let status = query.rows[0];

            let availability = Math.round(status.sla / status.total);
            return {availability: availability, atms: status.total, up: status.up, down: status.down};
        } else {
            let query = yield db.query("SELECT " +
                "SUM(CASE WHEN is_enabled='1' then 1 else 0 end) as total, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health >= 1 then 1 else 0 end) as up, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health = 0 then 1 else 0 end) as down, " +
                "SUM(CASE WHEN is_enabled='1' AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' then availability end) as availability " +
                "FROM terminals");

            if (!query.rowCount) return false;
            let status = query.rows[0];

            let availability = Math.round(status.availability / status.total);
            return {availability: availability, atms: status.total, up: status.up, down: status.down};
        }

    },
    getTerminalTransactions: function* (terminal, tag) {
        if (tag === 1) {
            let query = yield db.query("SELECT transaction_type,total_count,  total_value,Round((sum(total_count) * 55),2) as profit, " +
                "Round(sum(total_count) * 55- terminal_cost_config.total_cost,2) as revenue,max (timestamp) as last_updated" +
                " FROM public.nou_transactions inner join terminals on nou_transactions.terminal_id=terminals.terminal_id " +
                "right join terminal_cost_config on terminals.designation=terminal_cost_config.code where timestamp > current_timestamp - interval '1 day' " +
                "and terminals.terminal_id=$1 " +
                "GROUP BY nou_transactions.transaction_type,nou_transactions.total_value,nou_transactions.total_count,designation,terminal_cost_config.total_cost", [terminal]);

            if (!query.rowCount) return false;

            let nou_transactions = [];
            for (let entry of query.rows) {

                nou_transactions.push({
                    type: entry.transaction_type,
                    count: entry.total_count,
                    value: entry.total_value,
                    profit: entry.profit,
                    last_updated: app.formatDate(entry.last_updated),
                    revenue: entry.revenue
                });
            }
            return nou_transactions;
        }
        if (tag === 2) {

            let query = yield db.query("SELECT  transaction_type,total_count, total_value" +
                " FROM public.all_transactions inner join terminals on all_transactions.terminal_id=terminals.terminal_id " +
                "right join terminal_cost_config on terminals.designation=terminal_cost_config.code" +
                " where timestamp > current_timestamp - interval '1 day' and terminals.terminal_id =$1 " +
                "GROUP BY all_transactions.transaction_type,all_transactions.total_value,all_transactions.total_count,designation,terminal_cost_config.total_cost ", [terminal]);
            if (!query.rowCount) return false;
            let all_transactions = [];
            for (let entry of query.rows) {

                all_transactions.push({
                    type: entry.transaction_type,
                    count: entry.total_count,
                    value: entry.total_value
                });

            }
            return all_transactions;
        }
    },
    getLocationTransactions: function* (location, tag) {
        if (tag === 1) {
            let query = yield db.query("SELECT designation,sum(total_count)as total_count, sum(total_value) as total_value,Round((sum(total_count) * 55),2) as profit," +
                " Round(sum(total_count) * 55- terminal_cost_config.total_cost,2) as revenue,max (timestamp) as last_updated FROM" +
                " public.nou_transactions inner join terminals on nou_transactions.terminal_id=terminals.terminal_id right join " +
                "terminal_cost_config on terminals.designation=terminal_cost_config.code where" +
                " timestamp > current_timestamp - interval '1 day' and location_id =$1 " +
                "GROUP BY terminals.location_id, designation,terminal_cost_config.total_cost ", [location]);

            if (!query.rowCount) return false;

            let total_count = 0;
            let total_profit = 0;
            let total_value = 0;
            let last_updated = app.formatDate(query.rows[0].last_updated);
            for (let entry of query.rows) {

                total_count += parseFloat(entry.total_count);
                total_profit += parseFloat(entry.revenue);
                total_value += parseFloat(entry.total_value);
            }
            return {
                transaction_count: total_count,
                transaction_value: total_value,
                transaction_revenue: total_profit,
                last_updated: last_updated
            }
        }
        if (tag === 2) {
            let query = yield db.query("SELECT designation,sum(total_count)as total_count, sum(total_value) as total_value" +
                " FROM public.all_transactions inner join terminals on all_transactions.terminal_id=terminals.terminal_id " +
                "right join terminal_cost_config on terminals.designation=terminal_cost_config.code " +
                "where timestamp > current_timestamp - interval '1 day' and location_id =$1 " +
                "GROUP BY designation,terminal_cost_config.total_cost", [location]);
            if (!query.rowCount) return false;
            let total_count = 0;
            let total_value = 0;
            for (let entry of query.rows) {
                total_count += parseFloat(entry.total_count);
                total_value += parseFloat(entry.total_value);
            }
            return {transaction_count: total_count, transaction_value: total_value}
        }
    },
    getBranchTransactions: function* (branch, tag) {

        if (tag === 1) {
            let query = yield db.query("SELECT  designation,sum(total_count)as total_count, sum(total_value) as total_value,Round((sum(total_count) * 55),2) as profit," +
                " Round(sum(total_count) * 55- terminal_cost_config.total_cost,2) as revenue, max (timestamp) as last_updated" +
                " FROM public.nou_transactions inner join terminals on nou_transactions.terminal_id=terminals.terminal_id " +
                "right join terminal_cost_config on terminals.designation=terminal_cost_config.code where timestamp > current_timestamp - interval '1 day' and branch_code=$1" +
                " GROUP BY designation,terminal_cost_config.total_cost ", [branch]);

            if (!query.rowCount) return false;

            let total_count = 0;
            let total_profit = 0;
            let total_value = 0;
            let last_updated = app.formatDate(query.rows[0].last_updated);
            for (let entry of query.rows) {

                total_count += parseFloat(entry.total_count);
                total_profit += parseFloat(entry.revenue);
                total_value += parseFloat(entry.total_value);
            }
            return {
                transaction_count: total_count,
                transaction_value: total_value,
                transaction_revenue: total_profit,
                last_updated: last_updated
            }
        }
        if (tag === 2) {
            let query = yield db.query("SELECT designation,sum(total_count)as total_count, sum(total_value) as total_value" +
                " FROM public.all_transactions inner join terminals on all_transactions.terminal_id=terminals.terminal_id " +
                " where timestamp > current_timestamp - interval '1 day' and branch_code=$1" +
                " GROUP BY designation ", [branch]);
            if (!query.rowCount) return false;
            let total_count = 0;
            let total_value = 0;
            for (let entry of query.rows) {
                total_count += parseFloat(entry.total_count);
                total_value += parseFloat(entry.total_value);
            }
            return {transaction_count: total_count, transaction_value: total_value}
        }
    },
    getSubZoneTransactions: function* (subzone, tag) {
        if (tag === 1) {
            let query = yield db.query("SELECT  designation,sum(total_count)as total_count, sum(total_value) as total_value,Round((sum(total_count) * 55),2) as profit," +
                " Round(sum(total_count) * 55- terminal_cost_config.total_cost,2) as revenue,max (timestamp) as last_updated" +
                " FROM public.nou_transactions inner join terminals on nou_transactions.terminal_id=terminals.terminal_id " +
                "right join terminal_cost_config on terminals.designation=terminal_cost_config.code where timestamp > current_timestamp - interval '1 day' and subzone=$1" +
                " GROUP BY designation,terminal_cost_config.total_cost ", [subzone]);
            if (!query.rowCount) return false;

            let total_count = 0;
            let total_profit = 0;
            let total_value = 0;
            let last_updated = app.formatDate(query.rows[0].last_updated);
            for (let entry of query.rows) {
                total_count += parseFloat(entry.total_count);
                total_profit += parseFloat(entry.revenue);
                total_value += parseFloat(entry.total_value);
            }
            return {
                transaction_count: total_count,
                transaction_value: total_value,
                transaction_revenue: total_profit,
                last_updated: last_updated
            }
        }
        if (tag === 2) {
            let query = yield db.query("SELECT designation,sum(total_count)as total_count, sum(total_value) as total_value" +
                " FROM public.all_transactions inner join terminals on all_transactions.terminal_id=terminals.terminal_id " +
                " where timestamp > current_timestamp - interval '1 day' and subzone=$1" +
                " GROUP BY designation ", [subzone]);
            if (!query.rowCount) return false;
            let total_count = 0;
            let total_value = 0;
            for (let entry of query.rows) {
                total_count += parseFloat(entry.total_count);
                total_value += parseFloat(entry.total_value);
            }
            return {transaction_count: total_count, transaction_value: total_value}
        }
    },
    getZoneTransactions: function* (zone, tag) {
        if (tag === 1) {
            let query = yield db.query("SELECT  designation,sum(total_count)as total_count, sum(total_value) as total_value,Round((sum(total_count) * 55),2) as profit," +
                " Round(sum(total_count) * 55- terminal_cost_config.total_cost,2) as revenue,  max (timestamp) as last_updated" +
                " FROM public.nou_transactions inner join terminals on nou_transactions.terminal_id=terminals.terminal_id " +
                "right join terminal_cost_config on terminals.designation=terminal_cost_config.code where timestamp > current_timestamp - interval '1 day' and zone=$1" +
                " GROUP BY designation,terminal_cost_config.total_cost ", [zone]);
            if (!query.rowCount) return false;

            let total_count = 0;
            let total_profit = 0;
            let total_value = 0;
            let last_updated = app.formatDate(query.rows[0].last_updated);
            for (let entry of query.rows) {
                total_count += parseFloat(entry.total_count);
                total_profit += parseFloat(entry.revenue);
                total_value += parseFloat(entry.total_value);
            }
            return {
                transaction_count: total_count,
                transaction_value: total_value,
                transaction_revenue: total_profit,
                last_updated: last_updated
            }
        }
        if (tag === 2) {
            let query = yield db.query("SELECT designation,sum(total_count)as total_count, sum(total_value) as total_value" +
                " FROM public.all_transactions inner join terminals on all_transactions.terminal_id=terminals.terminal_id " +
                " where timestamp > current_timestamp - interval '1 day' and zone=$1" +
                " GROUP BY designation ", [zone]);
            if (!query.rowCount) return false;
            let total_count = 0;
            let total_value = 0;
            for (let entry of query.rows) {
                total_count += parseFloat(entry.total_count);
                total_value += parseFloat(entry.total_value);
            }
            return {transaction_count: total_count, transaction_value: total_value}
        }
    },
    getDomainTransactions: function* (tag) {

        if (tag === 1) {
            let query = yield db.query("SELECT  designation,sum(total_count)as total_count, sum(total_value) as total_value,Round((sum(total_count) * 55),2) as profit," +
                " Round(sum(total_count) * 55- terminal_cost_config.total_cost,2) as revenue, max (timestamp) as last_updated" +
                " FROM public.nou_transactions inner join terminals on nou_transactions.terminal_id=terminals.terminal_id " +
                "right join terminal_cost_config on terminals.designation=terminal_cost_config.code where timestamp > current_timestamp - interval '1 day'" +
                " GROUP BY designation,terminal_cost_config.total_cost ");
            if (!query.rowCount) return false;

            let total_count = 0;
            let total_profit = 0;
            let total_value = 0;
            let last_updated = app.formatDate(query.rows[0].last_updated);
            for (let entry of query.rows) {
                total_count += parseFloat(entry.total_count);
                total_profit += parseFloat(entry.revenue);
                total_value += parseFloat(entry.total_value);
                // last_updated=(app.formatDate(entry.last_updated));
                //  lasentry.last_updated;
            }

            return {
                transaction_count: total_count,
                transaction_value: total_value,
                transaction_revenue: total_profit,
                last_updated: last_updated
            }
        }

        if (tag === 2) {
            let query = yield db.query("SELECT  designation,sum(total_count)as total_count, sum(total_value) as total_value" +
                " FROM public.all_transactions inner join terminals on all_transactions.terminal_id=terminals.terminal_id " +
                " where timestamp > current_timestamp - interval '1 day'" +
                " GROUP BY designation ");
            if (!query.rowCount) return false;
            let total_count = 0;
            let total_value = 0;
            let last_updated = "";
            for (let entry of query.rows) {
                total_count += parseFloat(entry.total_count);
                total_value += parseFloat(entry.total_value);
            }
            return {transaction_count: total_count, transaction_value: total_value}
        }


        //return summary;
        //return {availability: availability, atms: status.total, up: status.up, down: status.down};
    },
    getTranSummary: function* (terminal_id, designation) {

        let query = yield  db.query("SELECT sum(nou_count) as nou_count, sum(nou_value) as nou_value," +
            "(sum(nou_count)* 55) as profit,(sum(nou_count)* 55-(select total_cost from terminal_cost_config where code=$2)) as revenue" +
            " FROM transactions where terminal_id=$1 ", [terminal_id, designation]);
        if (!query.rowCount) return false;
        let status = query.rows[0];
        return status;
    },
    getZoneTransaction: function* (zone) {
        "use strict";
        return false;
        let query = yield db.query("SELECT " +
            "SUM(CASE WHEN zone=$1 then 1 else 0 end) as total, " +
            "SUM(CASE WHEN zone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health >= 1 then 1 else 0 end) as up, " +
            "SUM(CASE WHEN zone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health = 0 then 1 else 0 end) as down, " +
            "SUM(CASE WHEN zone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' then sla end) as sla " +
            "FROM terminals WHERE is_enabled = '1'", [zone]);
        if (!query.rowCount) return false;
        let status = query.rows[0];
        return status;
    },
    getZoneStatus: function* (zone) {
        "use strict";

        if (sla.state == 1) {
            let query = yield db.query("SELECT " +
                "SUM(CASE WHEN zone=$1 then 1 else 0 end) as total, " +
                "SUM(CASE WHEN zone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health >= 1 then 1 else 0 end) as up, " +
                "SUM(CASE WHEN zone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health = 0 then 1 else 0 end) as down, " +
                "SUM(CASE WHEN zone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' then sla end) as sla " +
                "FROM terminals WHERE is_enabled = '1'", [zone]);

            if (!query.rowCount) return false;
            let status = query.rows[0];

            let availability = Math.round(status.sla / status.total);
            return {availability: availability, atms: status.total, up: status.up, down: status.down};
        } else {
            let query = yield db.query("SELECT " +
                "SUM(CASE WHEN zone=$1 then 1 else 0 end) as total, " +
                "SUM(CASE WHEN zone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health >= 1 then 1 else 0 end) as up, " +
                "SUM(CASE WHEN zone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health = 0 then 1 else 0 end) as down, " +
                "SUM(CASE WHEN zone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' then availability end) as availability " +
                "FROM terminals WHERE is_enabled = '1'", [zone]);

            if (!query.rowCount) return false;
            let status = query.rows[0];

            let availability = Math.round(status.availability / status.total);
            return {availability: availability, atms: status.total, up: status.up, down: status.down};
        }

    },

    getSubzoneStatus: function* (subzone) {
        "use strict";

        if (sla.state == 1) {
            let query = yield db.query("SELECT " +
                "SUM(CASE WHEN subzone=$1 then 1 else 0 end) as total, " +
                "SUM(CASE WHEN subzone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health >= 1 then 1 else 0 end) as up, " +
                "SUM(CASE WHEN subzone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health = 0 then 1 else 0 end) as down, " +
                "SUM(CASE WHEN subzone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' then sla end) as sla " +
                "FROM terminals WHERE is_enabled = '1'", [subzone]);

            if (!query.rowCount) return false;
            let status = query.rows[0];

            let availability = Math.round(status.sla / status.total);
            return {availability: availability, atms: status.total, up: status.up, down: status.down};
        } else {
            let query = yield db.query("SELECT " +
                "SUM(CASE WHEN subzone=$1 then 1 else 0 end) as total, " +
                "SUM(CASE WHEN subzone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health >= 1 then 1 else 0 end) as up, " +
                "SUM(CASE WHEN subzone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health = 0 then 1 else 0 end) as down, " +
                "SUM(CASE WHEN subzone=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' then availability end) as availability " +
                "FROM terminals WHERE is_enabled = '1'", [subzone]);

            if (!query.rowCount) return false;
            let status = query.rows[0];

            let availability = Math.round(status.availability / status.total);
            return {availability: availability, atms: status.total, up: status.up, down: status.down};
        }
    },

    getBranchStatus: function* (branch) {
        "use strict";

        if (sla.state == 1) {
            let query = yield db.query("SELECT " +
                "SUM(CASE WHEN branch_code=$1 then 1 else 0 end) as total, " +
                "SUM(CASE WHEN branch_code=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health >= 1 then 1 else 0 end) as up, " +
                "SUM(CASE WHEN branch_code=$1 AND health = 0 then 1 else 0 end) as down, " +
                "SUM(CASE WHEN branch_code=$1 then sla end) as sla " +
                "FROM terminals WHERE is_enabled = '1'", [branch]);

            if (!query.rowCount) return false;
            let status = query.rows[0];

            let availability = Math.round(status.sla / status.total);

            return {availability: availability, atms: status.total, up: status.up, down: status.down};
        } else {
            let query = yield db.query("SELECT " +
                "SUM(CASE WHEN branch_code=$1 then 1 else 0 end) as total, " +
                "SUM(CASE WHEN branch_code=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health >= 1 then 1 else 0 end) as up, " +
                "SUM(CASE WHEN branch_code=$1 AND health = 0 then 1 else 0 end) as down, " +
                "SUM(CASE WHEN branch_code=$1 then availability end) as availability " +
                "FROM terminals WHERE is_enabled = '1'", [branch]);

            if (!query.rowCount) return false;
            let status = query.rows[0];

            let availability = Math.round(status.availability / status.total);

            return {availability: availability, atms: status.total, up: status.up, down: status.down};
        }
    },

    getLocationStatus: function* (location) {
        "use strict";

        if (sla.state == 1) {
            let query = yield db.query("SELECT " +
                "SUM(CASE WHEN location_id=$1 then 1 else 0 end) as total, " +
                "SUM(CASE WHEN location_id=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health >= 1 then 1 else 0 end) as up, " +
                "SUM(CASE WHEN location_id=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health = 0 then 1 else 0 end) as down, " +
                "SUM(CASE WHEN location_id=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' then sla end) as sla " +
                "FROM terminals WHERE is_enabled = '1'", [location]);

            if (!query.rowCount) return false;
            let status = query.rows[0];

            let availability = Math.round(status.sla / status.total);
            return {
                availability: availability,
                atms: status.total,
                up: status.up,
                down: status.down,
                terminal_count: status.total
            };

        }
        else {
            let query = yield db.query("SELECT " +
                "SUM(CASE WHEN location_id=$1 then 1 else 0 end) as total, " +
                "SUM(CASE WHEN location_id=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health >= 1 then 1 else 0 end) as up, " +
                "SUM(CASE WHEN location_id=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' AND health = 0 then 1 else 0 end) as down, " +
                "SUM(CASE WHEN location_id=$1 AND cash_status_flag='1' AND cash_jam_flag='1' AND card_reader_flag='1' then availability end) as availability " +
                "FROM terminals WHERE is_enabled = '1'", [location]);

            if (!query.rowCount) return false;
            let status = query.rows[0];

            let availability = Math.round(status.availability / status.total);
            return {
                availability: availability,
                atms: status.total,
                up: status.up,
                down: status.down,
                terminal_count: status.total
            };
        }
    },

    getTerminalStatus: function* (terminal) {
        "use strict";

        let query = yield db.query(
            "SELECT updates.atm_status, card_count, terminals.balance as cash_level, updates.cash_status, updates.cash_jam, updates.card_reader, ROUND(terminals.availability) as availability, " +
            "terminals.name, ROUND(terminals.sla) as sla, terminals.sla_reason, terminals.make, terminals.type, terminals.health, terminals.last_healthy_time as up, terminals.last_issue_time as down " +
            "FROM updates RIGHT JOIN terminals ON (updates.terminal_id=terminals.terminal_id) " +
            "WHERE updates.terminal_id=$1 ORDER BY updates.id DESC LIMIT 1", [terminal]);

        if (!query.rowCount) return false;

        return query.rows[0];
    },
    getMerchantInfo:function* (m_id) {
        "use strict";
        let query = yield db.query('SELECT merchant_code_name, merchant_category FROM  merchants  where merchant_code=$1 limit 1',[m_id])
        if (!query.rowCount) return false;

        return query.rows[0];
    },
    getPosInfo:function *(tid) {
        "use strict";

        let query= yield db.query("select pos_terminals.terminal_id,pos_terminals.address, pos_terminals.merchant_id,merchants.merchant_category,merchant_code_name,email,pos_terminals.account_number,regions.region_name,regions.region_head,account_officer_name,pdo,visitation,ptsp,team_name from pos_terminals inner join merchants on pos_terminals.merchant_code=merchants.merchant_code left join regions on regions.terminal_id=pos_terminals.terminal_id left join account_officer on account_officer.terminal_id=pos_terminals.terminal_id left join support on support.merchant_id=pos_terminals.merchant_id left join teams on pos_terminals.team_code=pos_terminals.team_code where pos_terminals.terminal_id=$1 Limit 1",[tid]);
        if (!query.rowCount) return false;

        return query.rows[0];
    },
    decodeStatusException: function (exception, atm_status, cash_status) {
        "use strict";

        let decode = "";
        let statuses = exception.split(" ");

        for (let status of statuses) {
            if (decode != "") decode += ", ";

            if (status === "00") decode = "Everything OK";
            else if (status === "AS") decode += "ATM " + app.toTitleCase(atm_status);
            else if (status === "CS") decode += app.toTitleCase(cash_status);
            else if (status === "CJ") decode += "Cash Jam";
            else if (status === "CR") decode += "Card Reader Error";
        }

        return decode;
    },

    decodeUserLevel: function (level) {
        let levels = ["terminal", "location", "branch", "subzone", "zone", "domain", "domain", "domain"];
        return levels[Number(level)];
    },

    encodeUserLevel: function (levelString) {
        levelString = levelString.toLowerCase();

        let levels = ["terminal", "location", "branch", "subzone", "zone", "domain", "manager"];
        let i = 0;

        for (let level of levels) {
            if (level == levelString) return i;
            else i++;
        }
    },

    toTitleCase: function (string) {
        "use strict";

        string = string.replace("-", " ");

        return string.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    },

    rename: function (name) {
        let names = name.split(" ");
        return (names.length == 3) ? names[0].trim() + " " + names[2].trim() : names[0].trim() + " " + names[1].trim();
    },

    formatTime: function (time) {
        "use strict";

        let seconds = time / 1000;
        seconds = seconds % 3600;

        let minutes = parseInt(seconds / 60);

        seconds = seconds % 60;
        return minutes + ":" + seconds;
    },

    formatDate: function (date, timestamp) {
        "use strict";

        let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let hours = date.getHours();
        let minutes = date.getMinutes();
        minutes = minutes < 10 ? '0' + minutes : minutes;

        if (timestamp) {
            let seconds = date.getSeconds();

            return months[date.getMonth()].toUpperCase() + "/" + date.getDate() + " " +
                (hours < 10 ? "0" + hours : hours) + ':' + minutes + ':' + (seconds < 10 ? "0" + seconds : seconds);
        }

        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;

        return months[date.getMonth()] + " " + date.getDate() + ", " + hours + ':' + minutes + ' ' + ampm;
    },

    timestamp: function () {
        "use strict";

        return app.formatDate(new Date(), true);
    },

    /**
     * Calculate the time difference from now till @timestamp
     * @param {String} timestamp
     * @param {Boolean} shorthand
     */

    calculateDuration: function (timestamp, shorthand) {
        let delta = (new Date() - new Date(timestamp)) / 1000;

        let days = Math.floor(delta / 86400);
        let hours = Math.floor((delta - (days * 86400)) / 3600);
        let minutes = Math.floor((delta - (days * 86400) - (hours * 3600)) / 60);
        let seconds = Math.floor((delta - (days * 86400) - (hours * 3600) - (minutes * 60)));

        let output = "";

        if (shorthand) {
            if (days) output += days + "d ";
            if (hours) output += hours + "h ";
            if (minutes) output += minutes + "m";

            if (!days && !hours && !minutes) output = seconds + "s";
            return output.trim();
        }
        else {
            if (days) output += app.isPlural(days, "day") + " ";
            if (hours) output += app.isPlural(hours, "hour") + " ";
            if (minutes) output += app.isPlural(minutes, "minute") + " ";
            else if (!days && !hours && !minutes) output = app.isPlural(seconds, "second");
        }

        return output.trim();
    },

    isPlural: function (count, term) {
        return (count == 1) ? count + " " + term : count + " " + term + "s";
    },

    isValidEmail: function (email) {
        "use strict";

        if (!email || email == "") return false;

        email = email.trim();
        if (email == "" || !email) return false;
        let regex = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        return regex.test(email);
    },

    isDigitsOnly: function (string) {
        "use strict";

        return (!isNaN(parseInt(string)) && isFinite(string));
    },

    sendEmail: function (to, subject, message) {
        "use strict";

        let params = {
            Destination: {
                ToAddresses: [to]
            },
            Message: {
                Body: {
                    Html: {
                        Data: message,
                        Charset: 'UTF-8'
                    }
                },
                Subject: {
                    Data: subject,
                    Charset: 'UTF-8'
                }
            },
            Source: 'Symon ATM <symon@cloudstride.com>',
        };

        ses.sendEmail(params, function (success, error) {
            if (success) console.log(success);
            else console.log(error);

            return success || error;
        });
    },


    timeConverter: function (UNIX_timestamp) {
        var a = new Date(UNIX_timestamp * 1000);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var year = a.getFullYear();
        var month = months[a.getMonth()];
        var date = a.getDate();
        var hour = a.getHours();
        var min = a.getMinutes();
        var sec = a.getSeconds();
        var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
        return time;
    },
    broadcastException: function (terminal_id, exception, atm_status, cash_status, availability) {
        let terminal = db.query("SELECT name, zone, subzone, branch_code, location_id, location_name FROM terminals WHERE terminal_id=$1 LIMIT 1",
            [terminal_id],
            function (error, terminals) {
                if (error) return false;
                else if (!terminals.rowCount) return false;
                else terminal = terminals.rows[0];

                db.query("SELECT name, platform, pushtoken FROM users WHERE level=1 AND assignment=$1 OR level=2 AND assignment=$2 OR " +
                    "level=3 AND assignment=$3 OR level=4 AND assignment=$4",
                    [terminal.location_id, terminal.branch_code, terminal.subzone, terminal.zone],
                    function (error, custodians) {
                        let android = [];
                        let ios = [];
                        let broadcastCounter = 0;

                        for (let custodian of custodians.rows) {
                            if (custodian.platform === "ANDROID") android.push(custodian.pushtoken);
                            else if (custodian.platform === "IOS") ios.push(custodian.pushtoken);

                            if (custodian.platform === "ANDROID" || custodian.platform === "IOS") broadcastCounter++;
                        }

                        let title = terminal.name + " is at " + availability + "%";
                        let message = terminal_id + ": " + app.decodeStatusException(exception, atm_status, cash_status) + ". \nLocation: " + terminal.location_name;

                        app.sendANDROIDPush(android, title, message, terminal_id);
                        app.sendIOSPush(ios, title, message, terminal_id);

                        //if (broadcastCounter) console.log(terminal_id, "triggered", broadcastCounter, "PUSH Notifications");
                    });
            });
    },

    /**
     * @param {[]} tokens
     * @param {String} title
     * @param {String} message
     * @param {String} terminal_id
     * @return {void}
     */
    sendIOSPush: function (tokens, title, message, terminal_id) {
        if (!tokens.length) return false;

        let notification = new apn.Notification();
        notification.title = title;
        notification.alert = message;
        notification.sound = "ping.aiff";
        notification.payload = {terminal: terminal_id, title: title};
        notification.topic = "com.swipemax.symon";

        IOSPush.send(notification, tokens).then((result) => {
            //console.log(result);
        });
    },

    /**
     * @param {[]} tokens
     * @param {String} title
     * @param {String} message
     * @param {String} terminal_id
     * @return {void}
     */
    sendANDROIDPush: function (tokens, title, message, terminal_id) {
        if (!tokens.length) return false;

        var message = new gcm.Message({
            priority: 'high',
            restrictedPackageName: "com.swipemax.symon",
            data: {terminal: terminal_id},
            notification: {
                title: title,
                icon: "atm",
                body: message,
                sound: true
            }
        });

        ANDROIDPush.send(message, {registrationTokens: tokens}, function (error, response) {
            //console.log(error || response);
        });
    },
    launchTransactionUpdateSchedule: function () {
        let refresh_interval = (config.env === "PRODUCTION") ? 100 : 10;
        let options = {ignoreDotFiles: true, interval: refresh_interval, ignoreDirectoryPattern: /node_modules/};
        watch.watchTree(config[config.env].transFilePath, options, function (file, curr, prev) {
            if (typeof f == "object" && prev === null && curr === null) {
                console.log("Finished walking the tree")
            } else if (prev === null) {
                //  console.log(file + " is a new file")
            } else if (curr.nlink === 0) {
                //  console.log(file + " was removed")
            } else {
                console.log(file + " was changed");
                if (file.split(".csv").length > 1) {
                    console.log(file.substr(0, file.lastIndexOf('/') + 1));
                    var dir = config[config.env].transFilePath
                    var all = dir + "/atm_transactions_all.csv";
                    var nou = dir + "/atm_transactions_nou.csv";

                    console.log("all dump =>" + all);
                    app.runUpdateAll(all, 1);


                    console.log("nou dump=> " + nou);
                    app.runUpdateAll(nou, 2);

                }

            }
        });

    },
    launchUpdateSchedule: function () {
        "use strict";

        let refresh_interval = (config.env === "PRODUCTION") ? 60 : 10;

        let options = {ignoreDotFiles: true, interval: refresh_interval, ignoreDirectoryPattern: /node_modules/};
        watch.watchTree(config[config.env].updateFilePath, options, function (file, curr, prev) {
            if (typeof f == "object" && prev === null && curr === null) {
                console.log("Finished walking the tree")
            } else if (prev === null) {
                //console.log("f is a new file")
            } else if (curr.nlink === 0) {
                console.log("f was removed")
            } else {
                if (file.split(".csv").length > 1) return app.runUpdateTask(file);
            }
        });

        //open — reset checks/exception count all terminals for the new day
        cron.schedule("0 0 " + policies.open + " * * *", function () {
            db.query("UPDATE terminals SET checks=0, issues=0");
        });

        //close — send all terminal snapshot to history table
        cron.schedule("0 0 " + policies.close + " * * *", function () {
            console.log(app.timestamp(), "Closing logs for the day...");

            db.query("INSERT INTO history (terminal_id, branch_code, branch_name, zone, subzone, availability, sla, location_id) " +
                "SELECT terminal_id, branch_code, branch_name, zone, subzone, availability, sla, location_id FROM terminals");

            console.log(app.timestamp(), "Logs successfully closed for the day.");
        });

        return true;
    },
    runUpdateAll: function (file, type) {
        // if (app.isTransUpdateTaskRunning) return false;
        // else app.isTransUpdateTaskRunning = true;
        //
        // app.updateTrans = setTimeout(function () {
        //     app.isTransUpdateTaskRunning = false;
        // }, 5000);
        co(function* () {
            console.log(app.timestamp(), "Started update task.");

            console.log(app.timestamp(), "Fetching update file:", file);
            let updateFile = fs.readFileSync(file, "UTF-8");
            if (!updateFile) return console.log(app.timestamp(), "Error. Unable to read Trans update file.");
            else console.log(app.timestamp(), "OK=>Trans Update file parsed.");

            let list = yield csv.parse(updateFile);
            if (!list.length) return console.log(app.timestamp(), "ERROR. Update file is empty.");
            //else list.splice(0, 1); // remove labels row

            let total = list.length;
            if (!total) return console.log(app.timestamp(), "ERROR. Update file is empty.");
            else console.log(app.timestamp(), total, "updates found.");

            let updates = 0;

            for (let item of list) {
                updates++;
                let terminal = item[0];
                let transaction_type = item[1];
                let total_count = item[2];
                let total_value = item[3];

                //  console.log(terminal + " " + transaction_type + " " + total_count + " " + total_value);
                if (type === 1) {

                    db.query("INSERT INTO all_transactions (terminal_id, transaction_type, total_count, total_value) " +
                        "VALUES ($1, $2, $3, $4)",
                        [terminal, transaction_type, total_count, total_value]);
                }
                if (type === 2) {


                    db.query("INSERT INTO nou_transactions (terminal_id, transaction_type, total_count, total_value) " +
                        "VALUES ($1, $2, $3, $4)",
                        [terminal, transaction_type, total_count, total_value]);
                }

                if (updates >= total) console.log(app.timestamp(), "Completed update task successfully.");
            }
        }).catch(err => {
            console.log(err.stack);
            if (config.env === "PRODUCTION") {
                let emails = ["drj@swipemax.com", "john.babawale@swipemax.com"]
                for (let email of emails) {
                    app.sendEmail(email, "Error Caught on Symon ATM transaction Updates on " + new Date(), "Stack trace printed below" +
                        err.stack);
                }
                let accessEmails = ["atmsupport@accessbankplc.com", "kelly.egode@accessbankplc.com",
                    "ezenwa.osisiogu@accessbankplc.com", "fepsupport@accessbankplc.com"]
                for (let email of accessEmails) {
                    app.sendEmail(email, "System not updating " + new Date(),
                        "The ATM SYSTEM has witnessed an error in its updates. Please check to ensure we are fine.");
                }
            }

        });
    },
    runUpdateTask: function (file) {
        "use strict";

        if (app.isUpdateTaskRunning) return false;
        else app.isUpdateTaskRunning = true;

        app.updateTask = setTimeout(function () {
            app.isUpdateTaskRunning = false;
        }, 5000);

        co(function* () {
            console.log(app.timestamp(), "Started update task.");

            console.log(app.timestamp(), "Fetching update file:", file);
            let updateFile = fs.readFileSync(file, "UTF-8");
            if (!updateFile) return console.log(app.timestamp(), "Error. Unable to read update file.");
            else console.log(app.timestamp(), "OK. Update file parsed.");

            let list = yield csv.parse(updateFile);
            if (!list.length) return console.log(app.timestamp(), "ERROR. Update file is empty.");
            //else list.splice(0, 1); // remove labels row

            let total = list.length;
            if (!total) return console.log(app.timestamp(), "ERROR. Update file is empty.");
            else console.log(app.timestamp(), total, "updates found.");

            let updates = 0;

            for (let item of list) {
                updates++;

                item.splice(6, 2); // remove printer and paper statuses

                let terminal = item[0].split(" - "); // 10440011 - 1_HYO_B_APAPABURMA_1
                let terminal_id = terminal[0].trim(); // 10440011
                let terminal_name = terminal[1].trim(); // 1_HYO_B_APAPABURMA_1
                let atm_status = item[1].split(" - ")[1].trim(); // ATM STATUS - IN-SERVICE
                let card_count = item[2];
                let cash_level = Number(item[3]);
                let cash_status = item[4].split(" - ")[1].trim(); //  CASH STATUS - CASH ADEQUATE
                let cash_jam = item[5].split(" - ")[1].trim(); // JAM STATUS - NO CASH JAM
                let card_reader = item[6].split(" - ")[1].trim(); // CARD READER STATUS - OK
                let last_transaction = item[7];

                if (config.env === "DEVEL") {
                    //simulate randomized data for DEVEL environment

                    let ranger = function (min, max) {
                        return Math.floor(Math.random() * (max - min + 1) + min);
                    };
                    atm_status = ["IN-SERVICE", "OFFLINE", "SUPERVISOR", "CLOSED"][ranger(0, 3)];
                    card_count = ranger(0, 20);
                    cash_level = ranger(500000, 8000000);
                    cash_status = ["CASH ADEQUATE", "CASH LOW", "CASH OUT"][ranger(0, 2)];
                    cash_jam = ["CASH JAM", "NO CASH JAM"][ranger(0, 1)];
                    card_reader = ["OK", "FAULTY", "CARD RETAINED"][ranger(0, 2)];
                    last_transaction = new Date();
                }

                let availability = 0;
                let newIssue = 0;
                let health = 2;
                let exception = "";
                let sla_value = 100;

                let t_terminal = yield db.query("SELECT last_issue_time, last_healthy_time, last_sla_time, sla, sla_reason FROM terminals WHERE terminal_id=$1 LIMIT 1", [terminal_id]);

                t_terminal = t_terminal.rows[0];
                let sla_reason = "NEW";
                if (t_terminal) {
                    sla_reason = t_terminal.sla_reason;
                }

                if (cash_status === "CASH LOW") health = 1;

                // atm_status: IN-SERVICE (30), CLOSED (0), SUPERVISOR (15), OFFLINE (0)
                if (atm_status === "IN-SERVICE") availability += 35;
                else if (atm_status === "OFFLINE" || atm_status === "CLOSED") {
                    exception += "AS ";
                    newIssue = 1;
                    health = 0;
                    sla_value -= 10;
                    sla_reason = atm_status;
                }
                else if (atm_status === "SUPERVISOR") {
                    availability += 15;
                    sla_reason = atm_status;
                    exception += "AS ";
                    newIssue = 1;
                    health = 0;
                }

                // cash_status: CASH ADEQUATE (20), CASH LOW (15), CASH OUT (0)
                if (cash_status === "CASH ADEQUATE") availability += 20;
                else if (cash_status === "CASH LOW") {
                    availability += 15;
                    sla_reason = cash_status;
                    exception += "CS ";
                }
                else if (cash_status === "CASH OUT") {
                    exception += "CS ";
                    newIssue = 1;
                    health = 0;
                    sla_value -= 5;
                    sla_reason = cash_status;
                }

                // cash_jam: NO CASH JAM (23), CASH JAM (0)
                if (cash_jam === "NO CASH JAM") availability += 20;
                else {
                    exception += "CJ ";
                    newIssue = 1;
                    health = 0;
                    sla_value -= 5;
                    sla_reason = cash_jam;
                }

                // card_reader: OK (25), CARD RETAINED (25), UNKNOWN (20), FAULTY (0)
                if (card_reader === "OK" || card_reader === "CARD RETAINED") availability += 25;
                else if (card_reader === "UNKNOWN") availability += 20;
                else {
                    exception += "CR";
                    newIssue = 1;
                    health = 0;
                    sla_value -= 5;
                    sla_reason = card_reader;
                }

                exception = (exception === "") ? "00" : exception.trim();

                if (t_terminal) {
                    if (new Date() - (sla.time_interval) > t_terminal.last_sla_time ||
                        t_terminal.last_healthy_time > t_terminal.last_issue_time) {
                        db.query("UPDATE terminals SET sla=$1, last_sla_time=NOW(), sla_reason=$2 WHERE terminal_id=$3",
                            [sla_value, sla_reason, terminal_id]);
                    }
                }

                //switch to non-blocking mode for speed
                db.query("SELECT exception, issues, checks, terminals.cash_status as cash_status FROM updates RIGHT JOIN terminals ON terminals.terminal_id = updates.terminal_id " +
                    "WHERE terminals.terminal_id=$1 ORDER BY updates.id DESC LIMIT 1", [terminal_id],
                    function (error, result) {
                        if (error) return false;
                        else if (result.rowCount) {
                            let status = result.rows[0];
                            if (policies.monitoring === "CUMULATIVE") availability = Math.round(100 - (((status.issues + newIssue) / (status.checks + 1)) * 100));

                            let sql = "UPDATE terminals SET balance=$1, availability=$2, checks=checks+1, issues=issues+$3, health=$4, " +
                                "atm_status=$5, card_reader_status=$6, cash_status=$7, cash_jam_status=$8, last_updated=NOW() WHERE terminal_id=$9";

                            if (status.exception != exception || status.cash_status != cash_status) {
                                if (exception == "CS" && cash_status == "CASH LOW" || exception == "00") {
                                    sql = "UPDATE terminals SET balance=$1, availability=$2, checks=checks+1, issues=issues+$3, health=$4, " +
                                        "atm_status=$5, card_reader_status=$6, cash_status=$7, cash_jam_status=$8, last_updated=NOW(), last_healthy_time=NOW() WHERE terminal_id=$9";
                                }
                                else sql = "UPDATE terminals SET balance=$1, availability=$2, checks=checks+1, issues=issues+$3, health=$4, " +
                                    "atm_status=$5, card_reader_status=$6, cash_status=$7, cash_jam_status=$8, last_updated=NOW(), last_issue_time=NOW() WHERE terminal_id=$9";
                            }

                            db.query(sql, [cash_level, availability, newIssue, health, atm_status, card_reader, cash_status, cash_jam, terminal_id],
                                function (error, result) {
                                    if (error) console.log("Error updating terminal", error);
                                });

                            if (status.exception != exception || status.cash_status != cash_status) {
                                db.query("INSERT INTO updates " +
                                    "(terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, availability, exception) " +
                                    "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
                                    [terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, availability, exception]);

                                app.broadcastException(terminal_id, exception, atm_status, cash_status, availability);
                            }
                        }
                        else {
                            db.query("INSERT INTO terminals (terminal_id, name, balance, availability, zone, subzone, location_id, branch_name, location_name, checks, issues) " +
                                "VALUES ($1, $2, $3, $4, 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 0, 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED LOCATION', 1, $5)",
                                [terminal_id, terminal_name, cash_level, availability, newIssue]);
                        }
                    });

                if (updates >= total) console.log(app.timestamp(), "Completed update task successfully.");
            }
        }).catch(err => {
            console.log(err.stack)
            let emails = ["drj@swipemax.com", "john.babawale@swipemax.com", "joseph@swipemax.com"]
            for (let email of emails) {
                app.sendEmail(email, "Error Caught on Symon ATM Updates on " + new Date(), "Stack trace printed below" +
                    err.stack);
            }
            let accessEmails = ["atmsupport@accessbankplc.com", "kelly.egode@accessbankplc.com",
                "ezenwa.osisiogu@accessbankplc.com", "fepsupport@accessbankplc.com"]
            for (let email of accessEmails) {
                app.sendEmail(email, "System not updating " + new Date(),
                    "The ATM SYSTEM has witnessed an error in its updates. Please check to ensure we are fine.");
            }
        });
    }
};
