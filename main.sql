CREATE TABLE public.merchant (
	merchant_name varchar(250) NULL,
	merchant_code varchar(50) NULL,
	merchant_code_name varchar(150) NULL,
	merchant_category varchar(50) NULL,
	bank_acc_no varchar(10) NULL,
	physical_addr text ,
	lga varchar(15) NULL,
	state_code varchar(50) NULL,
	revenue numeric(15,2) NULL,
	merchant_id varchar(50) NULL
)
;

CREATE TABLE public.account_officer (
	account_officer_id bigserial NOT NULL,
	account_officer_name varchar(150) NULL,
	merchant_id varchar(50)  NULL,
	region_name varchar(150) NULL,
	PRIMARY KEY (account_officer_id)
);
CREATE INDEX account_officer_id ON account_officer USING btree (account_officer_id) ;

CREATE TABLE public.pos_terminals (
	merchant_id varchar(50)  NULL,
	team_code varchar(50)  NULL
);

CREATE TABLE public.region (
	region_name varchar(250) NOT NULL,
	regional_head_name varchar(250) NULL,
	PRIMARY KEY (region_name)
);
CREATE INDEX region_name ON region USING btree (region_name) ;

CREATE TABLE public.support (
	support_id bigserial NOT NULL,
	pdo varchar(150) NULL,
	visitation varchar(30) NULL,
	ptsp bpchar(10) NULL,
	merchant_id varchar(50) NULL,
	PRIMARY KEY (support_id)
);
CREATE INDEX support_id ON support USING btree (support_id) ;

CREATE TABLE public.team (
	team_code varchar(150) NOT NULL,
	team_name varchar(150) NULL,
	PRIMARY KEY (team_code)
);
CREATE INDEX team_code ON team USING btree (team_code) ;
