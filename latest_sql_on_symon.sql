---Grouping for the sbu---
select sbu, count(sbu) as sbu_count
from merchants
group by sbu

---Grouping for the region---
select region_name, count(region_name)
from region
where sbu = $1
group by region_name

--Grouping of Merchant by SBU----
select sbu,  merchant_code_name, count(merchant_code_name) from merchants where sbu = $1 group by merchant_code_name,sbu order by merchant_code_name

--Grouping of State by SBU----
select sbu,  merchant_code_name, state_code, count(state_code) from merchants inner join pos on pos.merchant_id=merchants.merchant_id where sbu = $1 and merchant_code_name = $2 group by state_code,merchant_code_name,sbu order by state_code

--Grouping of LG by SBU----
select sbu,  merchant_code_name, state_code, lga, count(lga) from merchants inner join pos on pos.merchant_id=merchants.merchant_id where sbu = $1 and merchant_code_name = $2  and state_code = $3 group by lga,state_code,merchant_code_name,sbu order by lga

--Grouping of Terminal by SBU----
select sbu,  merchant_code_name, terminal_id, merchant_name, state_code, lga, count(terminal_id) from merchants inner join pos on pos.merchant_id=merchants.merchant_id where sbu = $1 and merchant_code_name = $2  and state = $3 and lga = $4 group by terminal_id, lga,state_code,merchant_code_name,sbu order by terminal_id

--Single Terminal by SBU----
select sbu,  merchant_code_name, terminal_id, merchant_name, state_code, lga, count(terminal_id) from merchants inner join pos on pos.merchant_id=merchants.merchant_id where sbu = $1 and merchant_code_name = $2  and state = $3 and lga = $4  and terminal_id = $5 group by terminal_id, lga,state_code,merchant_code_name,sbu 

