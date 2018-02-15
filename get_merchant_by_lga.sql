select merchant_code, merchant_name, state_code, lga, count(lga) as lga_count 
from merchants
inner join terminal
on merchants.merchant_id = terminal.merchant_id  group by lga, merchant_code, merchant_name, state_code
