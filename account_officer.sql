INSERT INTO public.terminal_cost_config
(id, code, "name", average_cost, corporate_adjustment, updated, total_cost)
VALUES(1, 'CL', 'Customer Location', 0.00, 0.00, '2018-01-23 16:37:59.403', 0);
INSERT INTO public.terminal_cost_config
(id, code, "name", average_cost, corporate_adjustment, updated, total_cost)
VALUES(2, 'RO', 'Regular Offsite', 0.00, 0.00, '2018-01-23 16:38:19.828', 0);
INSERT INTO public.terminal_cost_config
(id, code, "name", average_cost, corporate_adjustment, updated, total_cost)
VALUES(3, 'IL', 'In Lobby', 0.00, 0.00, '2018-01-23 16:38:44.738', 0);
INSERT INTO public.terminal_cost_config
(id, code, "name", average_cost, corporate_adjustment, updated, total_cost)
VALUES(4, 'BR', 'Branch', 0.00, 0.00, '2018-01-23 16:39:13.595', 0);
INSERT INTO public.terminal_cost_config
(id, code, "name", average_cost, corporate_adjustment, updated, total_cost)
VALUES(5, 'SA', 'Strategic Atm', 0.00, 0.00, '2018-01-23 16:39:33.402', 0);

=====================================

CREATE TABLE public.account_officer (
	account_officer_name varchar(150) NULL,
	terminal_id varchar(150) NULL,
	account_officer_id bigserial NOT NULL
)
WITH (
	OIDS=FALSE
) ;
CREATE TABLE public.terminals (
	terminal_id varchar(10) NOT NULL,
	"name" text NULL,
	"type" varchar(32) NULL,
	make varchar(32) NULL,
	branch_code varchar(32) NULL,
	branch_name text NULL,
	"zone" varchar(64) NULL,
	subzone varchar(64) NULL,
	location_name text NULL,
	location_id int4 NULL,
	availability numeric(5,2) NULL,
	balance numeric(15,2) NULL,
	checks int4 NULL DEFAULT 0,
	issues int4 NULL DEFAULT 0,
	health int4 NULL DEFAULT 0,
	is_enabled bpchar(1) NULL DEFAULT '1'::bpchar,
	last_updated timestamp NULL DEFAULT now(),
	atm_status varchar(15) NULL,
	card_reader_status varchar(15) NULL,
	cash_status varchar(35) NULL,
	cash_jam_status varchar(15) NULL,
	last_healthy_time timestamp NULL DEFAULT now(),
	last_issue_time timestamp NULL DEFAULT now(),
	disable_value varchar NULL,
	cash_status_flag bpchar(1) NULL DEFAULT '1'::bpchar,
	cash_jam_flag bpchar(1) NULL DEFAULT '1'::bpchar,
	card_reader_flag bpchar(1) NULL DEFAULT '1'::bpchar,
	last_disable_time timestamp NULL DEFAULT now(),
	sla numeric(5,2) NULL DEFAULT '100'::numeric,
	sla_reason varchar(15) NULL,
	last_sla_time timestamp NULL DEFAULT now(),
	designation varchar(5) NULL,
	PRIMARY KEY (terminal_id)
)
WITH (
	OIDS=FALSE
) ;
CREATE INDEX check_statuses ON terminals USING btree (atm_status, card_reader_status, cash_status, cash_jam_status, is_enabled) ;
CREATE INDEX checks_exceptions ON terminals USING btree (checks, issues) ;
CREATE INDEX find_terminals ON terminals USING btree (zone, subzone, location_id, is_enabled, last_updated, name, health) ;
CREATE INDEX health ON terminals USING btree (is_enabled, health) ;

=======
CREATE TABLE public.all_transactions (
	id bigserial NOT NULL,
	terminal_id varchar(10) NULL,
	transaction_type varchar(100) NULL,
	total_count int4 NULL DEFAULT 0,
	total_value numeric(15,2) NULL DEFAULT 0,
	"timestamp" timestamp NULL DEFAULT now(),
	PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
=============
CREATE TABLE public.cbn_history (
	id bigserial NOT NULL,
	terminal_id varchar(10) NULL,
	branch_code varchar(32) NULL,
	branch_name text NULL,
	"zone" varchar(64) NULL,
	subzone varchar(64) NULL,
	location_id varchar(64) NULL,
	availability numeric(5,2) NULL,
	"timestamp" date NULL DEFAULT now(),
	PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
===========
CREATE TABLE public.history (
	id bigserial NOT NULL,
	terminal_id varchar(10) NULL,
	branch_code varchar(32) NULL,
	branch_name text NULL,
	"zone" varchar(64) NULL,
	subzone varchar(64) NULL,
	location_id varchar(64) NULL,
	availability numeric(5,2) NULL,
	"timestamp" date NULL DEFAULT now(),
	sla numeric(5,2) NULL DEFAULT '100'::numeric,
	issue_time timestamp NULL,
	"exception" varchar(15) NULL,
	PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
CREATE INDEX find_history ON history USING btree (terminal_id) ;
CREATE INDEX search ON history USING btree (branch_code, zone, subzone, location_id) ;
=============
CREATE TABLE public.merchant_info (
	id bigserial NOT NULL,
	merchant_code_name varchar(100) NULL,
	merchant_code varchar(100) NULL,
	sbu varchar(100) NULL,
	PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
================
CREATE TABLE public.merchants (
	merchant_name varchar NULL,
	merchant_code_name varchar NULL,
	merchant_category varchar NULL,
	merchant_id varchar NULL,
	merchant_code varchar NULL,
	email varchar NULL,
	sbu varchar NULL
)
WITH (
	OIDS=FALSE
) ;
==============
CREATE TABLE public.messages (
	id serial NOT NULL,
	message text NULL,
	PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
=====================
CREATE TABLE public.nou_transactions (
	id bigserial NOT NULL,
	terminal_id varchar(10) NULL,
	transaction_type varchar(100) NULL,
	total_count int4 NULL DEFAULT 0,
	total_value numeric(15,2) NULL DEFAULT 0,
	"timestamp" timestamp NULL DEFAULT now(),
	PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
==================
CREATE TABLE public.pos_terminals (
	terminal_id varchar NULL,
	merchant_id varchar(100) NULL,
	team_code varchar(50) NULL,
	address varchar NULL,
	account_number varchar NULL,
	lga varchar NULL,
	state_code varchar NULL,
	merchant_code varchar NULL
)
WITH (
	OIDS=FALSE
) ;
====================
CREATE TABLE public.pos_transactions (
	transaction_id varchar(150) NULL,
	terminal_id varchar(150) NULL,
	merchant_id varchar(150) NULL,
	transaction_type varchar(150) NULL,
	transaction_date varchar(150) NULL,
	transaction_amount numeric(15,2) NULL,
	"timestamp" int8 NULL,
	tid bigserial NOT NULL
)
WITH (
	OIDS=FALSE
) ;
=================
CREATE TABLE public.regions (
	region_name varchar(150) NULL,
	region_head varchar(150) NULL,
	terminal_id varchar(150) NULL,
	sbu varchar(150) NULL,
	merchant_code varchar(150) NULL,
	region_id bigserial NOT NULL
)
WITH (
	OIDS=FALSE
) ;
======================
CREATE TABLE public.sla_history (
	terminal_id varchar(10) NOT NULL,
	availability numeric(5,2) NULL,
	health int4 NULL DEFAULT 0,
	atm_status varchar(15) NULL,
	card_reader_status varchar(15) NULL,
	cash_status varchar(15) NULL,
	cash_jam_status varchar(15) NULL,
	PRIMARY KEY (terminal_id)
)
WITH (
	OIDS=FALSE
) ;
===============
CREATE TABLE public.support (
	support_officer varchar(150) NULL,
	phone varchar(150) NULL,
	merchant_id varchar(150) NULL,
	in_house varchar(150) NULL,
	phone_2 varchar(150) NULL,
	visitation varchar(150) NULL,
	ptsp varchar(150) NULL,
	support_id bigserial NOT NULL
)
WITH (
	OIDS=FALSE
) ;

=================
CREATE TABLE public.slaconfig (
	id int4 NOT NULL,
	time_interval int8 NULL,
	state bpchar(1) NULL DEFAULT '0'::bpchar,
	PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
CREATE TABLE public.teams (
	team_code varchar(150) NULL,
	team_name varchar(150) NULL
)
WITH (
	OIDS=FALSE
) ;
CREATE INDEX team_code ON teams USING btree (team_code) ;
CREATE TABLE public.terminal_cost_config (
	id bigserial NOT NULL,
	code varchar(10) NULL,
	"name" varchar(100) NULL,
	average_cost numeric(15,2) NULL,
	corporate_adjustment numeric(15,2) NULL,
	updated timestamp NULL DEFAULT now(),
	total_cost numeric NULL,
	PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
CREATE TABLE public.terminals (
	terminal_id varchar(10) NOT NULL,
	"name" text NULL,
	"type" varchar(32) NULL,
	make varchar(32) NULL,
	branch_code varchar(32) NULL,
	branch_name text NULL,
	"zone" varchar(64) NULL,
	subzone varchar(64) NULL,
	location_name text NULL,
	location_id int4 NULL,
	availability numeric(5,2) NULL,
	balance numeric(15,2) NULL,
	checks int4 NULL DEFAULT 0,
	issues int4 NULL DEFAULT 0,
	health int4 NULL DEFAULT 0,
	is_enabled bpchar(1) NULL DEFAULT '1'::bpchar,
	last_updated timestamp NULL DEFAULT now(),
	atm_status varchar(15) NULL,
	card_reader_status varchar(15) NULL,
	cash_status varchar(35) NULL,
	cash_jam_status varchar(15) NULL,
	last_healthy_time timestamp NULL DEFAULT now(),
	last_issue_time timestamp NULL DEFAULT now(),
	disable_value varchar NULL,
	cash_status_flag bpchar(1) NULL DEFAULT '1'::bpchar,
	cash_jam_flag bpchar(1) NULL DEFAULT '1'::bpchar,
	card_reader_flag bpchar(1) NULL DEFAULT '1'::bpchar,
	last_disable_time timestamp NULL DEFAULT now(),
	sla numeric(5,2) NULL DEFAULT '100'::numeric,
	sla_reason varchar(15) NULL,
	last_sla_time timestamp NULL DEFAULT now(),
	designation varchar(5) NULL,
	PRIMARY KEY (terminal_id)
)
WITH (
	OIDS=FALSE
) ;
CREATE INDEX check_statuses ON terminals USING btree (atm_status, card_reader_status, cash_status, cash_jam_status, is_enabled) ;
CREATE INDEX checks_exceptions ON terminals USING btree (checks, issues) ;
CREATE INDEX find_terminals ON terminals USING btree (zone, subzone, location_id, is_enabled, last_updated, name, health) ;
CREATE INDEX health ON terminals USING btree (is_enabled, health) ;
CREATE TABLE public.trail (
	id bigserial NOT NULL,
	user_id int8 NULL,
	"action" text NULL,
	"timestamp" timestamp NULL DEFAULT now(),
	user_name text NULL,
	PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
CREATE INDEX find_user ON trail USING btree (user_id) ;
CREATE TABLE public.updates (
	id bigserial NOT NULL,
	terminal_id varchar(10) NULL,
	atm_status varchar(32) NULL,
	card_count varchar(5) NULL,
	cash_level numeric(15,2) NULL,
	cash_status varchar(32) NULL,
	cash_jam varchar(32) NULL,
	card_reader varchar(32) NULL,
	last_transaction text NULL,
	"exception" varchar(15) NULL,
	availability numeric(5,2) NULL,
	"timestamp" timestamp NULL DEFAULT now(),
	PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
CREATE INDEX find_updates ON updates USING btree (id, terminal_id, exception) ;
CREATE TABLE public.wiphistory (
	id bigserial NOT NULL,
	terminal_id varchar(10) NULL,
	"name" text NULL,
	"type" varchar(32) NULL,
	make varchar(32) NULL,
	branch_code varchar(64) NULL,
	branch_name text NULL,
	"zone" varchar(64) NULL,
	subzone varchar(64) NULL,
	location_name text NULL,
	location_id varchar(64) NULL,
	availability numeric(5,2) NULL,
	last_healthy_time timestamp NULL DEFAULT now(),
	last_issue_time timestamp NULL DEFAULT now(),
	disable_value varchar NULL,
	last_disable_time timestamp NULL,
	PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
=================
INSERT INTO public.account_officer
(account_officer_name, terminal_id, account_officer_id)
VALUES('Osariase Idubor', '2044AW44', 1);
INSERT INTO public.account_officer
(account_officer_name, terminal_id, account_officer_id)
VALUES('Osariase Idubor', '2044AW03', 2);
INSERT INTO public.account_officer
(account_officer_name, terminal_id, account_officer_id)
VALUES('Osariase Idubor', '20449K76', 3);
INSERT INTO public.account_officer
(account_officer_name, terminal_id, account_officer_id)
VALUES('Osariase Idubor', '20449K75', 4);
INSERT INTO public.account_officer
(account_officer_name, terminal_id, account_officer_id)
VALUES('Osariase Idubor', '20449K74', 5);
INSERT INTO public.account_officer
(account_officer_name, terminal_id, account_officer_id)
VALUES('Osariase Idubor', '20449K73', 6);
INSERT INTO public.account_officer
(account_officer_name, terminal_id, account_officer_id)
VALUES('Ayooluwa Olawunmi Babajide', '20449K72', 7);
INSERT INTO public.account_officer
(account_officer_name, terminal_id, account_officer_id)
VALUES('Ayooluwa Olawunmi Babajide', '20449K71', 8);
INSERT INTO public.account_officer
(account_officer_name, terminal_id, account_officer_id)
VALUES('Osariase Idubor', '2044999T', 9);
INSERT INTO public.account_officer
(account_officer_name, terminal_id, account_officer_id)
VALUES('Osariase Idubor', '2044991R', 10);

================================
INSERT INTO public.wiphistory
(id, terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time)
VALUES(11, '10446663', 'SL_CLINE TOWN_NCR', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', '0', 0.00, '2017-10-04 12:08:56.648', '2017-10-04 12:11:46.525', NULL, '2017-10-04 12:08:56.648');
INSERT INTO public.wiphistory
(id, terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time)
VALUES(12, '35005001', 'ZM_Kitwe Branch_NCR', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', '0', 0.00, '2017-10-04 12:08:56.799', '2017-10-04 12:11:47.162', NULL, '2017-10-04 12:08:56.799');
INSERT INTO public.wiphistory
(id, terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time)
VALUES(13, '35004004', 'ZM_DangoteNdola_NCR', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', '0', 0.00, '2017-10-04 12:08:56.790', '2017-10-05 03:25:53.704', NULL, '2017-10-04 12:08:56.790');
INSERT INTO public.wiphistory
(id, terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time)
VALUES(14, '35004002', 'ZM_ZambeziPort_NCR', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', '0', 0.00, '2017-10-04 12:08:56.780', '2017-10-04 12:11:47.124', NULL, '2017-10-04 12:08:56.780');
INSERT INTO public.wiphistory
(id, terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time)
VALUES(15, '35004001', 'ZM_Ndola Branch_NCR', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', '0', 0.00, '2017-10-04 12:08:56.772', '2017-10-04 12:11:47.114', NULL, '2017-10-04 12:08:56.772');
INSERT INTO public.wiphistory
(id, terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time)
VALUES(16, '35003001', 'ZM_Acacia Branch_NCR', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', '0', 0.00, '2017-10-04 12:08:56.762', '2017-10-05 09:06:21.319', NULL, '2017-10-04 12:08:56.762');
INSERT INTO public.wiphistory
(id, terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time)
VALUES(17, '35002001', 'ZM_LongAcresBran_NCR', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', '0', 0.00, '2017-10-04 12:08:56.750', '2017-10-04 12:11:47.029', NULL, '2017-10-04 12:08:56.750');
INSERT INTO public.wiphistory
(id, terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time)
VALUES(18, '35001003', 'ZM_Oriental_Luka_NCR', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', '0', 0.00, '2017-10-04 12:08:56.742', '2017-10-04 12:11:46.998', NULL, '2017-10-04 12:08:56.742');
INSERT INTO public.wiphistory
(id, terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time)
VALUES(19, '35001002', 'ZM_CairoBranch 2_NCR', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', '0', 0.00, '2017-10-04 12:08:56.733', '2017-10-04 12:11:46.837', NULL, '2017-10-04 12:08:56.733');
INSERT INTO public.wiphistory
(id, terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, last_healthy_time, last_issue_time, disable_value, last_disable_time)
VALUES(20, '35001001', 'ZM_Cairo Branch_NCR', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', '0', 0.00, '2017-10-04 12:08:56.723', '2017-10-04 12:11:46.804', NULL, '2017-10-04 12:08:56.723');
==============
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2792, 'pos@accessbankplc.com', '28000d1d8a105adf1e6b2b725712c00ab326c944', 'RkhEwtShk6lT', 'Pos Team', 5, 'LOCAL', NULL, NULL, 'DOMAIN', true, '2018-02-23 16:13:13.454', '');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(1816, 'abiola.kayode@accessbankplc.com', '8abd54e8c4594210187ac0b97ff0ea6ea93f2e6f', 'EcPP3VhGY8rR', 'Abiola Kayode', 2, 'LDAP', 'ANDROID', 'eZLpEWHRZPA:APA91bH2eL0SROXvo30Kh5OAaazIBqXUsfETTgDKVUsh5AeNaQx39WLKKcIE7oqKy6qZDtdvknTap-GQBOGnM4RqNA50QBDyt2gQrz6gEUiRMBmeMTQedAnTAyr61WgujCGWPEiqzx8I', '223', true, '2017-04-28 14:13:10.550', 'akandea');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2783, 'akintola.oyewunmi@accessbankplc.com', '7ec13e58d6ee2018105a4936b3c88f5bb1dbacfc', 'CXKu2PT6NH76', 'Akintola Oyewunmi', 2, 'LDAP', NULL, NULL, '29', true, '2018-02-15 17:00:54.053', 'oyewunmia');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(1796, 'damilola.omenai@accessbankplc.com', '4b00d01d26826729589904d92e81f03226ed4cfd', 'szsHwNTfQFr8', 'Damilola Omenai', 2, 'LDAP', NULL, NULL, '236', true, '2017-04-28 14:13:10.416', 'omenaid');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2507, 'patricia.ayi@accessbankplc.com', '27f39199eb2dc3b2c468919836f44cca7f653a0b', 'mCvd9DhdPEZr', 'Patricia Ayi', 2, 'LDAP', 'ANDROID', 'e6zJiXjOJr0:APA91bGuIZgCNYKaJwIz7qAE0W6HowGVeOt2SNK_VFtn9UAMBEp6BqAt9vtVRFRCdc0i30TLZOLA6GcsbHBuylEkR4E6J7nFJWmaks9HDWkK1V0JPnwj12N5qMgVYVvzOl8v3EBJFRrd', '36', true, '2017-04-28 14:13:15.191', 'umohp');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2081, 'folayemi.oladejo@accessbankplc.com', '8f57f949709006ec4f4a69dd7b59dbedfe14e44b', 'E6OYZftqwUQ7', 'Folayemi Oladejo', 2, 'LDAP', 'ANDROID', 'fnMpjAct8WA:APA91bH_sqox6NGs4pA9_b2jUxZXn7YI2QwUFEjOSF4ArxNy3Xe2J5ED9Ae3SFuf6nQs7V9rz2V1fzo7vLOFSX1J8E9n7MnySc_ArpugrHAQYtWnlEJoxx53XzP_0HqtQXVBEYtsUhhl', '19', true, '2017-04-28 14:13:12.207', 'ayinuolaf');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(1804, 'abdulkabir.mosuro@accessbankplc.com', 'n87vIKGsUAyj', 'gIdJoWdUQU6O', 'Abdulkabir Mosuro', 2, 'LDAP', NULL, NULL, '273', true, '2017-04-28 14:13:10.478', 'mosuroa');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(13, 'ikpefua.ilavbaoje@accessbankplc.com', '9f01d313590053cc3de041c74d64be3a93efffce', 'jOuhhxVQa00z', 'Ikpefua Ilavbaoje', 5, 'LDAP', 'ANDROID', 'fZuBQITu7n4:APA91bHKLeBHsq49bmvmzX26FguvUqZ7YN3sstsVJtCaExhEutzvRi76D7iFAVsGm6aQgMQEFhbWVuedvf5Yeel277gkRcdTn_4g7spRF3k_iYh9orqzEeS2tfZK8if0wqVrVZ7ZpBAV', 'DOMAIN', true, '2017-04-24 13:01:14.904', 'ilavbaojei');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2167, 'jafaru.umar@accessbankplc.com', '6c797e2cdb53b7d3972a86dbff7930385545b9c1', 'AuZQuJxHoHof', 'Jafaru Umar', 2, 'LDAP', 'ANDROID', 'fIVXdq-1EQY:APA91bGE73WZlA3dYi8hpl6LBKkvk3gjfmYUO47HjydZyn_h_gTBiRbtxeyQn8-LQFm1GuFd1CvV6iVPL0c7UJWRDIUGhDpTQkFy58I_aAmh7UbqIa_tC4w-01hQZF-A6XOLrh7Bclwa', '277', true, '2017-04-28 14:13:12.843', 'umarj');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2769, 'sandra.okoli@accessbankplc.com', 'c18c9b1ca75606294d6580d27d4aff35c56db37c', '1D8dKNSJi6EJ', 'Sandra Okoli', 4, 'LDAP', NULL, NULL, 'LAGOS 1', true, '2017-08-29 15:37:44.452', 'okolis');


==================

INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2792, 'pos@accessbankplc.com', '28000d1d8a105adf1e6b2b725712c00ab326c944', 'RkhEwtShk6lT', 'Pos Team', 5, 'LOCAL', NULL, NULL, 'DOMAIN', true, '2018-02-23 16:13:13.454', '');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(1816, 'abiola.kayode@accessbankplc.com', '8abd54e8c4594210187ac0b97ff0ea6ea93f2e6f', 'EcPP3VhGY8rR', 'Abiola Kayode', 2, 'LDAP', 'ANDROID', 'eZLpEWHRZPA:APA91bH2eL0SROXvo30Kh5OAaazIBqXUsfETTgDKVUsh5AeNaQx39WLKKcIE7oqKy6qZDtdvknTap-GQBOGnM4RqNA50QBDyt2gQrz6gEUiRMBmeMTQedAnTAyr61WgujCGWPEiqzx8I', '223', true, '2017-04-28 14:13:10.550', 'akandea');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2783, 'akintola.oyewunmi@accessbankplc.com', '7ec13e58d6ee2018105a4936b3c88f5bb1dbacfc', 'CXKu2PT6NH76', 'Akintola Oyewunmi', 2, 'LDAP', NULL, NULL, '29', true, '2018-02-15 17:00:54.053', 'oyewunmia');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(1796, 'damilola.omenai@accessbankplc.com', '4b00d01d26826729589904d92e81f03226ed4cfd', 'szsHwNTfQFr8', 'Damilola Omenai', 2, 'LDAP', NULL, NULL, '236', true, '2017-04-28 14:13:10.416', 'omenaid');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2507, 'patricia.ayi@accessbankplc.com', '27f39199eb2dc3b2c468919836f44cca7f653a0b', 'mCvd9DhdPEZr', 'Patricia Ayi', 2, 'LDAP', 'ANDROID', 'e6zJiXjOJr0:APA91bGuIZgCNYKaJwIz7qAE0W6HowGVeOt2SNK_VFtn9UAMBEp6BqAt9vtVRFRCdc0i30TLZOLA6GcsbHBuylEkR4E6J7nFJWmaks9HDWkK1V0JPnwj12N5qMgVYVvzOl8v3EBJFRrd', '36', true, '2017-04-28 14:13:15.191', 'umohp');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2081, 'folayemi.oladejo@accessbankplc.com', '8f57f949709006ec4f4a69dd7b59dbedfe14e44b', 'E6OYZftqwUQ7', 'Folayemi Oladejo', 2, 'LDAP', 'ANDROID', 'fnMpjAct8WA:APA91bH_sqox6NGs4pA9_b2jUxZXn7YI2QwUFEjOSF4ArxNy3Xe2J5ED9Ae3SFuf6nQs7V9rz2V1fzo7vLOFSX1J8E9n7MnySc_ArpugrHAQYtWnlEJoxx53XzP_0HqtQXVBEYtsUhhl', '19', true, '2017-04-28 14:13:12.207', 'ayinuolaf');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(1804, 'abdulkabir.mosuro@accessbankplc.com', 'n87vIKGsUAyj', 'gIdJoWdUQU6O', 'Abdulkabir Mosuro', 2, 'LDAP', NULL, NULL, '273', true, '2017-04-28 14:13:10.478', 'mosuroa');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(13, 'ikpefua.ilavbaoje@accessbankplc.com', '9f01d313590053cc3de041c74d64be3a93efffce', 'jOuhhxVQa00z', 'Ikpefua Ilavbaoje', 5, 'LDAP', 'ANDROID', 'fZuBQITu7n4:APA91bHKLeBHsq49bmvmzX26FguvUqZ7YN3sstsVJtCaExhEutzvRi76D7iFAVsGm6aQgMQEFhbWVuedvf5Yeel277gkRcdTn_4g7spRF3k_iYh9orqzEeS2tfZK8if0wqVrVZ7ZpBAV', 'DOMAIN', true, '2017-04-24 13:01:14.904', 'ilavbaojei');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2167, 'jafaru.umar@accessbankplc.com', '6c797e2cdb53b7d3972a86dbff7930385545b9c1', 'AuZQuJxHoHof', 'Jafaru Umar', 2, 'LDAP', 'ANDROID', 'fIVXdq-1EQY:APA91bGE73WZlA3dYi8hpl6LBKkvk3gjfmYUO47HjydZyn_h_gTBiRbtxeyQn8-LQFm1GuFd1CvV6iVPL0c7UJWRDIUGhDpTQkFy58I_aAmh7UbqIa_tC4w-01hQZF-A6XOLrh7Bclwa', '277', true, '2017-04-28 14:13:12.843', 'umarj');
INSERT INTO public.users
(id, email, oauth, modulus, "name", "level", "type", platform, pushtoken, "assignment", active, "timestamp", username)
VALUES(2769, 'sandra.okoli@accessbankplc.com', 'c18c9b1ca75606294d6580d27d4aff35c56db37c', '1D8dKNSJi6EJ', 'Sandra Okoli', 4, 'LDAP', NULL, NULL, 'LAGOS 1', true, '2017-08-29 15:37:44.452', 'okolis');

==================
INSERT INTO public.updates
(id, terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, "exception", availability, "timestamp")
VALUES(1, '10440021', 'IN-SERVICE', '3', 6624000.00, 'CASH ADEQUATE', 'NO CASH JAM', 'OK', '4/20/2017 9:03:26 PM', '00', 100.00, '2017-04-20 21:20:08.795');
INSERT INTO public.updates
(id, terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, "exception", availability, "timestamp")
VALUES(2, '10440011', 'IN-SERVICE', '0', 2967500.00, 'CASH ADEQUATE', 'NO CASH JAM', 'OK', '4/20/2017 9:12:23 PM', '00', 100.00, '2017-04-20 21:20:08.795');
INSERT INTO public.updates
(id, terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, "exception", availability, "timestamp")
VALUES(3, '10440033', 'IN-SERVICE', '0', 2414000.00, 'CASH ADEQUATE', 'NO CASH JAM', 'OK', '4/20/2017 8:57:04 PM', '00', 100.00, '2017-04-20 21:20:08.811');
INSERT INTO public.updates
(id, terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, "exception", availability, "timestamp")
VALUES(4, '10440032', 'OFFLINE', '2', 1916500.00, 'CASH LOW', 'CASH JAM', 'OK', '4/20/2017 6:59:51 PM', 'AS CS CJ', 0.00, '2017-04-20 21:20:08.811');
INSERT INTO public.updates
(id, terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, "exception", availability, "timestamp")
VALUES(5, '10440042', 'IN-SERVICE', '0', 1253500.00, 'CASH LOW', 'NO CASH JAM', 'OK', '4/20/2017 9:15:43 PM', 'CS', 100.00, '2017-04-20 21:20:08.811');
INSERT INTO public.updates
(id, terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, "exception", availability, "timestamp")
VALUES(6, '10440034', 'IN-SERVICE', '3', 1820500.00, 'CASH LOW', 'CASH JAM', 'OK', '4/20/2017 8:52:24 PM', 'CS CJ', 0.00, '2017-04-20 21:20:08.811');
INSERT INTO public.updates
(id, terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, "exception", availability, "timestamp")
VALUES(7, '10440045', 'IN-SERVICE', '0', 2853000.00, 'CASH ADEQUATE', 'NO CASH JAM', 'OK', '4/20/2017 9:12:41 PM', '00', 100.00, '2017-04-20 21:20:08.811');
INSERT INTO public.updates
(id, terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, "exception", availability, "timestamp")
VALUES(8, '10440041', 'IN-SERVICE', '0', 3712500.00, 'CASH ADEQUATE', 'NO CASH JAM', 'OK', '4/20/2017 9:01:08 PM', '00', 100.00, '2017-04-20 21:20:08.811');
INSERT INTO public.updates
(id, terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, "exception", availability, "timestamp")
VALUES(9, '10440043', 'IN-SERVICE', '0', 1127000.00, 'CASH LOW', 'CASH JAM', 'OK', '4/20/2017 9:19:44 PM', 'CS CJ', 0.00, '2017-04-20 21:20:08.811');
INSERT INTO public.updates
(id, terminal_id, atm_status, card_count, cash_level, cash_status, cash_jam, card_reader, last_transaction, "exception", availability, "timestamp")
VALUES(10, '10440044', 'IN-SERVICE', '0', 3031500.00, 'CASH ADEQUATE', 'NO CASH JAM', 'OK', '4/20/2017 9:18:56 PM', '00', 100.00, '2017-04-20 21:20:08.811');

==============
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('1044034L', '558_HYO_O_BAU_NYSC_1', 'O', 'HYO', '34', 'BAUCHI BRANCH', 'NORTH', 'NORTH 1', 'NYSC BAUCHI', 558, 0.00, 1176500.00, 0, 0, 0, '1', '2018-02-07 10:59:39.329', 'OFFLINE', 'OK', 'CASH LOW WARNING', 'NO CASH JAM', '2018-02-05 13:07:34.391', '2018-02-05 13:13:34.168', NULL, '1', '1', '1', '2017-10-04 12:08:40.778', 90.00, 'OFFLINE', '2018-02-07 10:21:38.265', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('1044147A', '229_NDC_O_ETTA_2', 'O', 'NCR', '147', 'CALABAR 1 BRANCH', 'PORT-HARCOURT & SOUTH-SOUTH', 'AKWA IBOM & CROSS RIVER', '10 CALABAR ROAD, UNICAL SMALL GATE OKOI ARIKPO, CALABAR', 229, 0.00, 0.00, 0, 0, 0, '0', '2017-11-14 11:24:53.865', 'OFFLINE', 'CARD RETAINED', 'CASH OUT', 'CASH JAM', '2017-10-04 12:08:45.467', '2017-10-04 12:09:46.651', '9', '1', '1', '1', '2017-10-11 13:47:17.936', 100.00, 'CASH JAM', '2017-11-15 11:49:17.093', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10441629', '598_HYO_O_SOK_NYSC_1', 'O', 'HYO', '162', 'SOKOTO 2 BRANCH', 'NORTH', 'NORTH 2', 'NYSC SOKOTO', 598, 0.00, 1207000.00, 0, 0, 0, '1', '2018-02-07 09:43:59.752', 'OFFLINE', 'OK', 'CASH LOW WARNING', 'NO CASH JAM', '2018-02-05 10:51:55.007', '2018-02-05 11:19:54.429', NULL, '1', '1', '1', '2017-10-04 12:08:46.213', 90.00, 'OFFLINE', '2018-02-07 08:23:58.106', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10441574', '555_HYO_O_RIV_NYSC_1', 'O', 'HYO', '157', 'ELEME BRANCH', 'PORT-HARCOURT & SOUTH-SOUTH', 'PH 2', 'NYSC RIVERS', 555, 0.00, 1953500.00, 0, 0, 0, '1', '2018-02-12 13:20:43.866', 'OFFLINE', 'OK', 'CASH LOW WARNING', 'NO CASH JAM', '2018-02-05 12:41:54.448', '2018-02-05 15:19:54.222', NULL, '1', '1', '1', '2017-10-04 12:08:45.984', 90.00, 'OFFLINE', '2018-02-12 12:40:42.201', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10442663', '640_HYO_O_ARTICLMK_2', 'O', 'HYO', '266', 'ASPAMDA BRANCH', 'LAGOS 1', 'APAPA 2', 'ARTIKU MARKET CASH CENTER', 640, 0.00, 0.00, 0, 0, 0, '1', '2018-01-08 23:18:54.252', 'OFFLINE', 'OK', 'CASH OUT', 'NO CASH JAM', '2017-10-04 12:08:52.787', '2017-10-24 17:22:04.291', NULL, '1', '1', '1', '2017-10-04 12:08:52.787', 85.00, 'CASH OUT', '2018-01-08 21:28:39.162', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('1044059D', '557_HYO_O_YOL_NYSC_1', 'O', 'HYO', '59', 'YOLA BRANCH', 'NORTH', 'NORTH 1', 'NYSC YOLA', 557, 0.00, 0.00, 0, 0, 0, '1', '2017-12-13 12:05:35.553', 'OFFLINE', 'OK', 'CASH OUT', 'CASH JAM', '2017-12-10 02:49:54.766', '2017-12-12 11:36:15.731', NULL, '1', '1', '1', '2017-10-04 12:08:41.715', 80.00, 'CASH JAM', '2017-12-13 10:05:33.354', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10440506', '639_NCR_O_GOODMOR_1', 'O', 'NCR', '50', 'IYANA  IPAJA BRANCH', 'LAGOS 2', 'IKEJA 2', 'GOODMORNING PETROLEUM, IPAJA LAGOS', 639, 0.00, 0.00, 0, 0, 0, '1', '2017-10-04 19:23:27.630', 'OFFLINE', 'OK', 'CASH OUT', 'NO CASH JAM', '2017-10-04 12:08:41.427', '2017-10-04 12:09:31.430', NULL, '1', '1', '1', '2017-10-04 12:08:41.427', 100.00, NULL, '2017-11-15 11:49:17.093', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10440347', '57_WNC_O_FEDPOLBA_2', 'O', 'WNC', '34', 'BAUCHI BRANCH', 'NORTH', 'NORTH 1', 'FEDERAL POLYTECHNIC BAUCHI @ GWALLAMEJI', 57, 0.00, 0.00, 0, 0, 0, '1', '2017-10-04 12:08:40.736', NULL, NULL, NULL, NULL, '2017-10-04 12:08:40.736', '2017-10-04 12:08:40.736', NULL, '1', '1', '1', '2017-10-04 12:08:40.736', 100.00, NULL, '2017-11-15 11:49:17.093', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10440344', '57_NDC_O_FEDPOLBA_1', 'O', 'NCR', '34', 'BAUCHI BRANCH', 'NORTH', 'NORTH 1', 'FEDERAL POLYTECHNIC BAUCHI @ GWALLAMEJI', 57, 0.00, 0.00, 0, 0, 0, '1', '2017-10-04 12:08:40.724', NULL, NULL, NULL, NULL, '2017-10-04 12:08:40.724', '2017-10-04 12:08:40.724', NULL, '1', '1', '1', '2017-10-04 12:08:40.724', 100.00, NULL, '2017-11-15 11:49:17.093', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10442681', 'DEC_AKUNGBA_01', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', 0, 0.00, 0.00, 0, 0, 0, '1', '2017-10-04 12:08:52.829', NULL, NULL, NULL, NULL, '2017-10-04 12:08:52.829', '2017-10-04 12:08:52.829', NULL, '1', '1', '1', '2017-10-04 12:08:52.829', 100.00, NULL, '2017-11-15 11:49:17.093', 'BR');


==================

INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('1044034L', '558_HYO_O_BAU_NYSC_1', 'O', 'HYO', '34', 'BAUCHI BRANCH', 'NORTH', 'NORTH 1', 'NYSC BAUCHI', 558, 0.00, 1176500.00, 0, 0, 0, '1', '2018-02-07 10:59:39.329', 'OFFLINE', 'OK', 'CASH LOW WARNING', 'NO CASH JAM', '2018-02-05 13:07:34.391', '2018-02-05 13:13:34.168', NULL, '1', '1', '1', '2017-10-04 12:08:40.778', 90.00, 'OFFLINE', '2018-02-07 10:21:38.265', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('1044147A', '229_NDC_O_ETTA_2', 'O', 'NCR', '147', 'CALABAR 1 BRANCH', 'PORT-HARCOURT & SOUTH-SOUTH', 'AKWA IBOM & CROSS RIVER', '10 CALABAR ROAD, UNICAL SMALL GATE OKOI ARIKPO, CALABAR', 229, 0.00, 0.00, 0, 0, 0, '0', '2017-11-14 11:24:53.865', 'OFFLINE', 'CARD RETAINED', 'CASH OUT', 'CASH JAM', '2017-10-04 12:08:45.467', '2017-10-04 12:09:46.651', '9', '1', '1', '1', '2017-10-11 13:47:17.936', 100.00, 'CASH JAM', '2017-11-15 11:49:17.093', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10441629', '598_HYO_O_SOK_NYSC_1', 'O', 'HYO', '162', 'SOKOTO 2 BRANCH', 'NORTH', 'NORTH 2', 'NYSC SOKOTO', 598, 0.00, 1207000.00, 0, 0, 0, '1', '2018-02-07 09:43:59.752', 'OFFLINE', 'OK', 'CASH LOW WARNING', 'NO CASH JAM', '2018-02-05 10:51:55.007', '2018-02-05 11:19:54.429', NULL, '1', '1', '1', '2017-10-04 12:08:46.213', 90.00, 'OFFLINE', '2018-02-07 08:23:58.106', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10441574', '555_HYO_O_RIV_NYSC_1', 'O', 'HYO', '157', 'ELEME BRANCH', 'PORT-HARCOURT & SOUTH-SOUTH', 'PH 2', 'NYSC RIVERS', 555, 0.00, 1953500.00, 0, 0, 0, '1', '2018-02-12 13:20:43.866', 'OFFLINE', 'OK', 'CASH LOW WARNING', 'NO CASH JAM', '2018-02-05 12:41:54.448', '2018-02-05 15:19:54.222', NULL, '1', '1', '1', '2017-10-04 12:08:45.984', 90.00, 'OFFLINE', '2018-02-12 12:40:42.201', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10442663', '640_HYO_O_ARTICLMK_2', 'O', 'HYO', '266', 'ASPAMDA BRANCH', 'LAGOS 1', 'APAPA 2', 'ARTIKU MARKET CASH CENTER', 640, 0.00, 0.00, 0, 0, 0, '1', '2018-01-08 23:18:54.252', 'OFFLINE', 'OK', 'CASH OUT', 'NO CASH JAM', '2017-10-04 12:08:52.787', '2017-10-24 17:22:04.291', NULL, '1', '1', '1', '2017-10-04 12:08:52.787', 85.00, 'CASH OUT', '2018-01-08 21:28:39.162', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('1044059D', '557_HYO_O_YOL_NYSC_1', 'O', 'HYO', '59', 'YOLA BRANCH', 'NORTH', 'NORTH 1', 'NYSC YOLA', 557, 0.00, 0.00, 0, 0, 0, '1', '2017-12-13 12:05:35.553', 'OFFLINE', 'OK', 'CASH OUT', 'CASH JAM', '2017-12-10 02:49:54.766', '2017-12-12 11:36:15.731', NULL, '1', '1', '1', '2017-10-04 12:08:41.715', 80.00, 'CASH JAM', '2017-12-13 10:05:33.354', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10440506', '639_NCR_O_GOODMOR_1', 'O', 'NCR', '50', 'IYANA  IPAJA BRANCH', 'LAGOS 2', 'IKEJA 2', 'GOODMORNING PETROLEUM, IPAJA LAGOS', 639, 0.00, 0.00, 0, 0, 0, '1', '2017-10-04 19:23:27.630', 'OFFLINE', 'OK', 'CASH OUT', 'NO CASH JAM', '2017-10-04 12:08:41.427', '2017-10-04 12:09:31.430', NULL, '1', '1', '1', '2017-10-04 12:08:41.427', 100.00, NULL, '2017-11-15 11:49:17.093', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10440347', '57_WNC_O_FEDPOLBA_2', 'O', 'WNC', '34', 'BAUCHI BRANCH', 'NORTH', 'NORTH 1', 'FEDERAL POLYTECHNIC BAUCHI @ GWALLAMEJI', 57, 0.00, 0.00, 0, 0, 0, '1', '2017-10-04 12:08:40.736', NULL, NULL, NULL, NULL, '2017-10-04 12:08:40.736', '2017-10-04 12:08:40.736', NULL, '1', '1', '1', '2017-10-04 12:08:40.736', 100.00, NULL, '2017-11-15 11:49:17.093', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10440344', '57_NDC_O_FEDPOLBA_1', 'O', 'NCR', '34', 'BAUCHI BRANCH', 'NORTH', 'NORTH 1', 'FEDERAL POLYTECHNIC BAUCHI @ GWALLAMEJI', 57, 0.00, 0.00, 0, 0, 0, '1', '2017-10-04 12:08:40.724', NULL, NULL, NULL, NULL, '2017-10-04 12:08:40.724', '2017-10-04 12:08:40.724', NULL, '1', '1', '1', '2017-10-04 12:08:40.724', 100.00, NULL, '2017-11-15 11:49:17.093', 'BR');
INSERT INTO public.terminals
(terminal_id, "name", "type", make, branch_code, branch_name, "zone", subzone, location_name, location_id, availability, balance, checks, issues, health, is_enabled, last_updated, atm_status, card_reader_status, cash_status, cash_jam_status, last_healthy_time, last_issue_time, disable_value, cash_status_flag, cash_jam_flag, card_reader_flag, last_disable_time, sla, sla_reason, last_sla_time, designation)
VALUES('10442681', 'DEC_AKUNGBA_01', '', '', '', 'UNCLASSIFIED BRANCH', 'UNCLASSIFIED ZONE', 'UNCLASSIFIED SUBZONE', 'UNCLASSIFIED LOCATION', 0, 0.00, 0.00, 0, 0, 0, '1', '2017-10-04 12:08:52.829', NULL, NULL, NULL, NULL, '2017-10-04 12:08:52.829', '2017-10-04 12:08:52.829', NULL, '1', '1', '1', '2017-10-04 12:08:52.829', 100.00, NULL, '2017-11-15 11:49:17.093', 'BR');

==================
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Lagos 1 Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Lagos 1 Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');

==============

INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Lagos 1 Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Lagos 1 Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');
INSERT INTO public.teams
(team_code, team_name)
VALUES('Olumide Olatunji', 'Commercial Banking Island Zone');

==================
INSERT INTO public.slaconfig
(id, time_interval, state)
VALUES(1, 10800000, '1');


==================
INSERT INTO public.regions
(region_name, region_head, terminal_id, sbu, merchant_code, region_id)
VALUES('Commercial Banking Island Zone', 'Olumide Olatunji', '2044AW44', 'CBD', '1', 1);
INSERT INTO public.regions
(region_name, region_head, terminal_id, sbu, merchant_code, region_id)
VALUES('Commercial Banking Island Zone', 'Olumide Olatunji', '2044AW03', 'CBD', '1', 2);
INSERT INTO public.regions
(region_name, region_head, terminal_id, sbu, merchant_code, region_id)
VALUES('Commercial Banking Island Zone', 'Olumide Olatunji', '20449K76', 'CBD', '1', 3);
INSERT INTO public.regions
(region_name, region_head, terminal_id, sbu, merchant_code, region_id)
VALUES('Commercial Banking Island Zone', 'Olumide Olatunji', '20449K75', 'CBD', '1', 4);
INSERT INTO public.regions
(region_name, region_head, terminal_id, sbu, merchant_code, region_id)
VALUES('Commercial Banking Island Zone', 'Olumide Olatunji', '20449K74', 'CBD', '1', 5);
INSERT INTO public.regions
(region_name, region_head, terminal_id, sbu, merchant_code, region_id)
VALUES('Commercial Banking Island Zone', 'Olumide Olatunji', '20449K73', 'CBD', '1', 6);
INSERT INTO public.regions
(region_name, region_head, terminal_id, sbu, merchant_code, region_id)
VALUES('Commercial Banking Lagos 1 Zone', 'Olumide Olatunji', '20449K72', 'CBD', '1', 7);
INSERT INTO public.regions
(region_name, region_head, terminal_id, sbu, merchant_code, region_id)
VALUES('Commercial Banking Lagos 1 Zone', 'Olumide Olatunji', '20449K71', 'CBD', '1', 8);
INSERT INTO public.regions
(region_name, region_head, terminal_id, sbu, merchant_code, region_id)
VALUES('Commercial Banking Island Zone', 'Olumide Olatunji', '2044999T', 'CBD', '1', 9);
INSERT INTO public.regions
(region_name, region_head, terminal_id, sbu, merchant_code, region_id)
VALUES('Commercial Banking Island Zone', 'Olumide Olatunji', '2044991R', 'CBD', '1', 10);

==============
INSERT INTO public.pos_transactions
(transaction_id, terminal_id, merchant_id, transaction_type, transaction_date, transaction_amount, "timestamp", tid)
VALUES('2690817187', '2044360N', '2044FC000002120', 'Purchase', '26/02/18 09:40', 5000.00, 1519634431, 74393);
INSERT INTO public.pos_transactions
(transaction_id, terminal_id, merchant_id, transaction_type, transaction_date, transaction_amount, "timestamp", tid)
VALUES('2691171342', '2044317W', '2044LA000014556', 'Purchase', '26/02/18 11:48', 20000.00, 1519642103, 74394);
INSERT INTO public.pos_transactions
(transaction_id, terminal_id, merchant_id, transaction_type, transaction_date, transaction_amount, "timestamp", tid)
VALUES('2690939962', '2044673L', '2044LA000011287', 'Purchase', '26/02/18 10:32', 1420.00, 1519637561, 74395);
INSERT INTO public.pos_transactions
(transaction_id, terminal_id, merchant_id, transaction_type, transaction_date, transaction_amount, "timestamp", tid)
VALUES('2691409452', '2044BY09', '2044LAV00000552', 'Purchase', '26/02/18 13:02', 2307.61, 1519646574, 74396);
INSERT INTO public.pos_transactions
(transaction_id, terminal_id, merchant_id, transaction_type, transaction_date, transaction_amount, "timestamp", tid)
VALUES('2691907387', '2044537T', '2044LA000013215', 'Purchase', '26/02/18 15:47', 30000.00, 1519656436, 74397);
INSERT INTO public.pos_transactions
(transaction_id, terminal_id, merchant_id, transaction_type, transaction_date, transaction_amount, "timestamp", tid)
VALUES('2691951715', '2044317W', '2044LA000014556', 'Purchase', '26/02/18 16:02', 5000.00, 1519657331, 74398);
INSERT INTO public.pos_transactions
(transaction_id, terminal_id, merchant_id, transaction_type, transaction_date, transaction_amount, "timestamp", tid)
VALUES('2692051273', '2044989M', '2044LA000011486', 'Purchase', '26/02/18 16:34', 24200.00, 1519659295, 74399);
INSERT INTO public.pos_transactions
(transaction_id, terminal_id, merchant_id, transaction_type, transaction_date, transaction_amount, "timestamp", tid)
VALUES('2692187129', '2044835V', '2044LA000014347', 'Purchase', '26/02/18 17:21', 2810.00, 1519662110, 74400);
INSERT INTO public.pos_transactions
(transaction_id, terminal_id, merchant_id, transaction_type, transaction_date, transaction_amount, "timestamp", tid)
VALUES('2692710756', '2044699T', '2044LA000011346', 'Purchase', '26/02/18 20:36', 24400.00, 1519673790, 74401);
INSERT INTO public.pos_transactions
(transaction_id, terminal_id, merchant_id, transaction_type, transaction_date, transaction_amount, "timestamp", tid)
VALUES('2692847118', '2044A520', '2044FC00V000007', 'Purchase', '26/02/18 21:42', 3024.00, 1519677733, 74402);


==================

INSERT INTO public.pos_terminals
(terminal_id, merchant_id, team_code, address, account_number, lga, state_code, merchant_code)
VALUES('2044QD35', '2044RI00V000164', 'DEJ810', 'Port Harcourt  Int Airport Omagwa Port harcourt-owerri Road, Port Harcourt', '0055771203', 'PORT HARCOURT', 'RI', '10');
INSERT INTO public.pos_terminals
(terminal_id, merchant_id, team_code, address, account_number, lga, state_code, merchant_code)
VALUES('2044221V', '2044FC000003283', 'MTG510', 'NNAMDI AZIKWE AIRPORT, ABUJA.', '0059196484', 'ABUJA', 'FC', '10');
INSERT INTO public.pos_terminals
(terminal_id, merchant_id, team_code, address, account_number, lga, state_code, merchant_code)
VALUES('20441D35', '2044LA000016428', 'MTG510', 'Plot 47, Aba road, CFC bus stop by Chinese restaurant, Eastern Garden, Port Harcourt, Rivers', '0720476981', 'Ikeja', 'LA', '10');
INSERT INTO public.pos_terminals
(terminal_id, merchant_id, team_code, address, account_number, lga, state_code, merchant_code)
VALUES('2044222V', '2044FC000003283', 'MTG510', 'NNAMDI AZIKWE AIRPORT, ABUJA.', '0059196484', 'ABUJA', 'FC', '10');
INSERT INTO public.pos_terminals
(terminal_id, merchant_id, team_code, address, account_number, lga, state_code, merchant_code)
VALUES('2044052N', '2044LA000011500', 'MTG510', 'ARIK AIR, MMIA, IKEJA, LAGOS.', '0065385973', 'IKEJA', 'LA', '10');
INSERT INTO public.pos_terminals
(terminal_id, merchant_id, team_code, address, account_number, lga, state_code, merchant_code)
VALUES('2044QD26', '2044PL00V000045', 'MTG510', 'Yakubu Gowon Airport, Abattoir Road, Jos', '0055768731', 'JOS', 'PL', '10');
INSERT INTO public.pos_terminals
(terminal_id, merchant_id, team_code, address, account_number, lga, state_code, merchant_code)
VALUES('2044450L', '2044FC000001995', 'MTG510', 'Arik CTO, Melitta Plaza, Gwarzo Close, off Gimbiya street, Off Ahmadu Bello Way, Area II, Abuja', '0015839691', 'ABUJA', 'FC', '10');
INSERT INTO public.pos_terminals
(terminal_id, merchant_id, team_code, address, account_number, lga, state_code, merchant_code)
VALUES('2044285W', '2044IM000000541', 'MTG510', 'ARIK AIR -OWERRI, IMO STATE', '0697289627', 'OWERRI', 'IM', '10');
INSERT INTO public.pos_terminals
(terminal_id, merchant_id, team_code, address, account_number, lga, state_code, merchant_code)
VALUES('20441R96', '2044KW000000702', 'MTG510', 'ILORIN BRANCH - 199A, STADIUM SHOPPING COMPLEX,IBRAHIM TAIWO ROAD, ILORIN, KWARA STATE.', '0725436342', 'ILORIN', 'KW', '10');
INSERT INTO public.pos_terminals
(terminal_id, merchant_id, team_code, address, account_number, lga, state_code, merchant_code)
VALUES('2044718N', '2044LA000011500', 'MTG510', 'ARIK AIR, MMIA, IKEJA, LAGOS.', '0065385973', 'IKEJA', 'LA', '10');

==================
INSERT INTO public.policies
(id, up, down, "open", "close", monitoring)
VALUES(1, 96, 94, 8, 20, 'CUMULATIVE');
==============================
INSERT INTO public.messages
(id, message)
VALUES(7, 'sECURITY CONCERNS');
INSERT INTO public.messages
(id, message)
VALUES(8, 'SUBSIDIARY ATM');
INSERT INTO public.messages
(id, message)
VALUES(9, 'INVERTER ISSUES');
INSERT INTO public.messages
(id, message)
VALUES(10, 'POWER ISSUES');
INSERT INTO public.messages
(id, message)
VALUES(0, 'DISABLED');
INSERT INTO public.messages
(id, message)
VALUES(11, 'nysc location');
INSERT INTO public.messages
(id, message)
VALUES(12, 'deployment issue');
INSERT INTO public.messages
(id, message)
VALUES(13, 'renovation/relocation');

==========================
INSERT INTO public.merchants
(merchant_name, merchant_code_name, merchant_category, merchant_id, merchant_code, email, sbu)
VALUES('FOUANI NIG LTD - JOS BRANCH OFFICE', 'FOUANI NIGERIA LTD', 'Top 100', '2044PL000000691', '1', 'jos@fouani.com', 'CBD');
INSERT INTO public.merchants
(merchant_name, merchant_code_name, merchant_category, merchant_id, merchant_code, email, sbu)
VALUES('FOUANI NIG LTD - ALLEN', 'FOUANI NIGERIA LTD', 'Top 100', '2044LA000013062', '1', 'finance@fouani.com', 'CBD');
INSERT INTO public.merchants
(merchant_name, merchant_code_name, merchant_category, merchant_id, merchant_code, email, sbu)
VALUES('FOUANI NIGERIA LIMITED_HQ', 'FOUANI NIGERIA LTD', '', '2044RI000004347', '1', 'transamadi.hisense@fouani.com', 'CBD');
INSERT INTO public.merchants
(merchant_name, merchant_code_name, merchant_category, merchant_id, merchant_code, email, sbu)
VALUES('FOUANI NIGERIA LIMITED_HQ', 'FOUANI NIGERIA LTD', '', '2044RI000004347', '1', 'transamadi.hisense@fouani.com', 'CBD');
INSERT INTO public.merchants
(merchant_name, merchant_code_name, merchant_category, merchant_id, merchant_code, email, sbu)
VALUES('FOUANI NIGERIA LIMITED_HQ', 'FOUANI NIGERIA LTD', '', '2044LA000019120', '1', 'apapa.hisense@fouani.com', 'CBD');
INSERT INTO public.merchants
(merchant_name, merchant_code_name, merchant_category, merchant_id, merchant_code, email, sbu)
VALUES('FOUANI NIGERIA LIMITED_HQ', 'FOUANI NIGERIA LTD', '', '2044LA000019120', '1', 'apapa.hisense@fouani.com', 'CBD');
INSERT INTO public.merchants
(merchant_name, merchant_code_name, merchant_category, merchant_id, merchant_code, email, sbu)
VALUES('FOUANI NIGERIA LIMITED_HQ', 'FOUANI NIGERIA LTD', '', '2044LA000019119', '1', 'ajah.colours@fouani.com', 'CBD');
INSERT INTO public.merchants
(merchant_name, merchant_code_name, merchant_category, merchant_id, merchant_code, email, sbu)
VALUES('FOUANI NIGERIA LIMITED_HQ', 'FOUANI NIGERIA LTD', '', '2044LA000019119', '1', 'ajah.colours@fouani.com', 'CBD');
INSERT INTO public.merchants
(merchant_name, merchant_code_name, merchant_category, merchant_id, merchant_code, email, sbu)
VALUES('FOUANI NIG LTD - ALLEN', 'FOUANI NIGERIA LTD', 'Top 100', '2044LA000013413', '1', 'finance@fouani.com', 'CBD');
INSERT INTO public.merchants
(merchant_name, merchant_code_name, merchant_category, merchant_id, merchant_code, email, sbu)
VALUES('FOUANI NIGERIA LTD_HQ', 'FOUANI NIGERIA LTD', 'Top 100', '2044LA000012410', '1', 'finance@fouani.com', 'CBD');

=============================

============================
INSERT INTO public.merchant_info
(id, merchant_code_name, merchant_code, sbu)
VALUES(1, 'FOUANI NIGERIA LTD', '1', 'CBD');
INSERT INTO public.merchant_info
(id, merchant_code_name, merchant_code, sbu)
VALUES(2, 'ARIK AIR', '10', 'CIBD');
INSERT INTO public.merchant_info
(id, merchant_code_name, merchant_code, sbu)
VALUES(3, 'SUNDAY EBODIA          ED', '100', 'PBD');
INSERT INTO public.merchant_info
(id, merchant_code_name, merchant_code, sbu)
VALUES(4, 'SYLVESTER EKENE EKE', '1000', 'BBD');
INSERT INTO public.merchant_info
(id, merchant_code_name, merchant_code, sbu)
VALUES(5, 'J.O.AKUSHIE & SONS (NIGIM', '1001', 'CBD');
INSERT INTO public.merchant_info
(id, merchant_code_name, merchant_code, sbu)
VALUES(6, 'DANNY MART AJIRAN RD AGUNGI LEKKI', '1002', 'BBD');
INSERT INTO public.merchant_info
(id, merchant_code_name, merchant_code, sbu)
VALUES(7, 'Chuks Technical Nig. Ent', '1003', 'BBD');
INSERT INTO public.merchant_info
(id, merchant_code_name, merchant_code, sbu)
VALUES(8, 'AUSTIN INNOCENT ODII', '1004', 'PBD');
INSERT INTO public.merchant_info
(id, merchant_code_name, merchant_code, sbu)
VALUES(9, 'FAITH ALIKEJU AYEGBA   FC', '1005', 'PBD');
INSERT INTO public.merchant_info
(id, merchant_code_name, merchant_code, sbu)
VALUES(10, 'STEPHIXX NIG LIMITED   LA', '1006', 'CIBD');

===============
INSERT INTO public.history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp", sla, issue_time, "exception")
VALUES(362019, '10443243', '324', 'OGIDI BRANCH', 'SOUTH EAST', 'SOUTH EAST 2', '490', 0.00, '2017-11-18', 95.00, NULL, NULL);
INSERT INTO public.history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp", sla, issue_time, "exception")
VALUES(440852, '10440593', '59', 'YOLA BRANCH', 'NORTH', 'NORTH 1', '95', 0.00, '2018-01-04', 85.00, NULL, NULL);
INSERT INTO public.history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp", sla, issue_time, "exception")
VALUES(440853, '1044065F', '65', 'IKOTA EXPRESS GALLERY BRANCH', 'LAGOS 1', 'VICTORIA ISLAND', '106', 0.00, '2018-01-04', 85.00, NULL, NULL);
INSERT INTO public.history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp", sla, issue_time, "exception")
VALUES(362022, '10441121', '112', 'BANK OF INDUSTRY (BOI), ABUJA', 'ABUJA & NORTH CENTRAL', 'ABUJA 2', '179', 100.00, '2017-11-18', 100.00, NULL, NULL);
INSERT INTO public.history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp", sla, issue_time, "exception")
VALUES(362023, '10441145', '114', 'MUR MOHAMMED WAY, KANO', 'NORTH', 'NORTH 3', '181', 0.00, '2017-11-18', 90.00, NULL, NULL);
INSERT INTO public.history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp", sla, issue_time, "exception")
VALUES(362024, '10441325', '132', 'BANK ROAD OWERRI BRANCH', 'SOUTH EAST', 'SOUTH EAST 3', '205', 0.00, '2017-11-18', 95.00, NULL, NULL);
INSERT INTO public.history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp", sla, issue_time, "exception")
VALUES(362025, '10441429', '142', 'ALAGBADO BRANCH', 'LAGOS 2', 'IKEJA 2', '217', 96.00, '2017-11-18', 100.00, NULL, NULL);
INSERT INTO public.history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp", sla, issue_time, "exception")
VALUES(362035, '10443041', '304', 'EKET BRANCH', 'PORT-HARCOURT & SOUTH-SOUTH', 'AKWA IBOM & CROSS RIVER', '460', 98.00, '2017-11-18', 100.00, NULL, NULL);
INSERT INTO public.history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp", sla, issue_time, "exception")
VALUES(440854, '10442433', '243', 'BUKURU BRANCH', 'ABUJA & NORTH CENTRAL', 'NORTH CENTRAL 1', '377', 82.00, '2018-01-04', 100.00, NULL, NULL);
INSERT INTO public.history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp", sla, issue_time, "exception")
VALUES(440855, '1044065k', '65', 'IKOTA EXPRESS GALLERY BRANCH', 'LAGOS 1', 'VICTORIA ISLAND', '106', 0.00, '2018-01-04', 85.00, NULL, NULL);

===============
INSERT INTO public.cbn_history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp")
VALUES(44, '10440055', '5', 'OSHOGBO BRANCH', 'SOUTH WEST', 'WEST 4', '8', 100.00, '2016-10-01');
INSERT INTO public.cbn_history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp")
VALUES(45, '10440055', '5', 'OSHOGBO BRANCH', 'SOUTH WEST', 'WEST 4', '8', 100.00, '2016-10-02');
INSERT INTO public.cbn_history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp")
VALUES(46, '10440055', '5', 'OSHOGBO BRANCH', 'SOUTH WEST', 'WEST 4', '8', 100.00, '2016-10-03');
INSERT INTO public.cbn_history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp")
VALUES(47, '10440055', '5', 'OSHOGBO BRANCH', 'SOUTH WEST', 'WEST 4', '8', 100.00, '2016-10-04');
INSERT INTO public.cbn_history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp")
VALUES(48, '10440055', '5', 'OSHOGBO BRANCH', 'SOUTH WEST', 'WEST 4', '8', 100.00, '2016-10-05');
INSERT INTO public.cbn_history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp")
VALUES(49, '10440055', '5', 'OSHOGBO BRANCH', 'SOUTH WEST', 'WEST 4', '8', 100.00, '2016-10-06');
INSERT INTO public.cbn_history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp")
VALUES(50, '10440055', '5', 'OSHOGBO BRANCH', 'SOUTH WEST', 'WEST 4', '8', 100.00, '2016-10-07');
INSERT INTO public.cbn_history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp")
VALUES(51, '10440055', '5', 'OSHOGBO BRANCH', 'SOUTH WEST', 'WEST 4', '8', 100.00, '2016-10-08');
INSERT INTO public.cbn_history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp")
VALUES(52, '10440055', '5', 'OSHOGBO BRANCH', 'SOUTH WEST', 'WEST 4', '8', 100.00, '2016-10-09');
INSERT INTO public.cbn_history
(id, terminal_id, branch_code, branch_name, "zone", subzone, location_id, availability, "timestamp")
VALUES(53, '10440055', '5', 'OSHOGBO BRANCH', 'SOUTH WEST', 'WEST 4', '8', 100.00, '2016-10-10');

==================
INSERT INTO public.all_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(590846, '10440341', 'Cash Withdrawal', 202, 2316000.00, '2018-02-11 06:10:56.702');
INSERT INTO public.all_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(590896, '1044035E', 'Payment from account', 6, 63250.00, '2018-02-11 06:10:56.720');
INSERT INTO public.all_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(590947, '10440384', 'Goods and Services', 1, 200.00, '2018-02-11 06:10:56.737');
INSERT INTO public.all_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(590997, '10440404', 'Goods and Services', 2, 1100.00, '2018-02-11 06:10:56.756');
INSERT INTO public.all_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(591043, '10440447', 'Cash Withdrawal', 116, 1139500.00, '2018-02-11 06:10:56.772');
INSERT INTO public.all_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(591093, '10440531', 'Payment from account', 11, 324200.00, '2018-02-11 06:10:56.795');
INSERT INTO public.all_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(591143, '10440576', 'Payment from account', 2, 160000.00, '2018-02-11 06:10:56.816');
INSERT INTO public.all_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(591193, '10440611', 'Cash Withdrawal', 57, 447000.00, '2018-02-11 06:10:56.834');
INSERT INTO public.all_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(591244, '1044065I', 'Cardholder Accounts Transfer', 1, 12000.00, '2018-02-11 06:10:56.850');
INSERT INTO public.all_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(591293, '10440714', 'Goods and Services', 1, 200.00, '2018-02-11 06:10:56.868');

============
INSERT INTO public.nou_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(1050353, '10441735', 'Goods and Services', 1, 200.00, '2018-03-07 06:10:03.319');
INSERT INTO public.nou_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(1050374, '10441753', 'Goods and Services', 1, 100.00, '2018-03-07 06:10:03.319');
INSERT INTO public.nou_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(1050405, '10441773', 'Cash Withdrawal', 25, 331000.00, '2018-03-07 06:10:03.335');
INSERT INTO public.nou_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(1050426, '10441795', 'Cash Withdrawal', 26, 265000.00, '2018-03-07 06:10:03.335');
INSERT INTO public.nou_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(1050453, '10441809', 'Payment from account', 3, 224000.00, '2018-03-07 06:10:03.350');
INSERT INTO public.nou_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(1050476, '10441812', 'Payment from account', 4, 89000.00, '2018-03-07 06:10:03.350');
INSERT INTO public.nou_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(1050503, '10441851', 'Cash Withdrawal', 88, 730000.00, '2018-03-07 06:10:03.366');
INSERT INTO public.nou_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(1050526, '10441882', 'Cash Withdrawal', 95, 1033500.00, '2018-03-07 06:10:03.366');
INSERT INTO public.nou_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(1050545, '10441893', 'Payment from account', 4, 116000.00, '2018-03-07 06:10:03.382');
INSERT INTO public.nou_transactions
(id, terminal_id, transaction_type, total_count, total_value, "timestamp")
VALUES(1050569, '10441922', 'Goods and Services', 2, 300.00, '2018-03-07 06:10:03.382');
