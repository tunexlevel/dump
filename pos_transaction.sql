create table pos_transaction(
    transaction_code bigSerial,
    transaction_id varchar(150),
    terminal_id varchar(150),
    merchant_id varchar(150),
    transaction_type varchar(100),
    transaction_date varchar(100),
    transaction_amount numeric(15,2),
    primary key (transaction_code)
)
