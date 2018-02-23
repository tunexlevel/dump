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

