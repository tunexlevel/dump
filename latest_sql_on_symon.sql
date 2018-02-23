---Grouping for the sbu---
select sbu, count(terminal_id) as tid_count, count(merchant_id) as mid_count
from region
group by sbu, terminal_id, merchhant_id

---Grouping for the region---
select region_name, count(terminal_id) as tid_count, count(merchant_id) as mid_count
from region
where sbu = $1
group by region_name, terminal_id, merchhant_id
