CREATE TABLE public.account_officer (
	account_officer_name varchar(150) NULL,
	terminal_id varchar(150) NULL,
	account_officer_id bigserial NOT NULL
)
WITH (
	OIDS=FALSE
) ;
<?xml version="1.0" ?>
<!DOCTYPE select_from_account_officer_limit_10 [
  <!ELEMENT select_from_account_officer_limit_10 (DATA_RECORD*)>
  <!ELEMENT DATA_RECORD (account_officer_name?,terminal_id?,account_officer_id?)+>
  <!ELEMENT account_officer_name (#PCDATA)>
  <!ELEMENT terminal_id (#PCDATA)>
  <!ELEMENT account_officer_id (#PCDATA)>
]>
<select_from_account_officer_limit_10>
  <DATA_RECORD>
    <account_officer_name>Osariase Idubor</account_officer_name>
    <terminal_id>2044AW44</terminal_id>
    <account_officer_id>1</account_officer_id>
  </DATA_RECORD>
  <DATA_RECORD>
    <account_officer_name>Osariase Idubor</account_officer_name>
    <terminal_id>2044AW03</terminal_id>
    <account_officer_id>2</account_officer_id>
  </DATA_RECORD>
  <DATA_RECORD>
    <account_officer_name>Osariase Idubor</account_officer_name>
    <terminal_id>20449K76</terminal_id>
    <account_officer_id>3</account_officer_id>
  </DATA_RECORD>
  <DATA_RECORD>
    <account_officer_name>Osariase Idubor</account_officer_name>
    <terminal_id>20449K75</terminal_id>
    <account_officer_id>4</account_officer_id>
  </DATA_RECORD>
  <DATA_RECORD>
    <account_officer_name>Osariase Idubor</account_officer_name>
    <terminal_id>20449K74</terminal_id>
    <account_officer_id>5</account_officer_id>
  </DATA_RECORD>
  <DATA_RECORD>
    <account_officer_name>Osariase Idubor</account_officer_name>
    <terminal_id>20449K73</terminal_id>
    <account_officer_id>6</account_officer_id>
  </DATA_RECORD>
  <DATA_RECORD>
    <account_officer_name>Ayooluwa Olawunmi Babajide</account_officer_name>
    <terminal_id>20449K72</terminal_id>
    <account_officer_id>7</account_officer_id>
  </DATA_RECORD>
  <DATA_RECORD>
    <account_officer_name>Ayooluwa Olawunmi Babajide</account_officer_name>
    <terminal_id>20449K71</terminal_id>
    <account_officer_id>8</account_officer_id>
  </DATA_RECORD>
  <DATA_RECORD>
    <account_officer_name>Osariase Idubor</account_officer_name>
    <terminal_id>2044999T</terminal_id>
    <account_officer_id>9</account_officer_id>
  </DATA_RECORD>
  <DATA_RECORD>
    <account_officer_name>Osariase Idubor</account_officer_name>
    <terminal_id>2044991R</terminal_id>
    <account_officer_id>10</account_officer_id>
  </DATA_RECORD>
</select_from_account_officer_limit_10>
