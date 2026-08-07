INSERT INTO RegionLov (Code,Description) VALUES 
('ALLOVER','All Over India'),
('AP','Andhra Pradesh'),
('AR','Arunachal Pradesh'),
('AS','Assam'),
('BH','Bihar'),
('CT','Chhattisgarh'),
('GA','Goa'),
('GJ','Gujarat'),
('HR','Haryana'),
('HP','Himachal Pradesh'),
('JH','Jharkhand'),
('KA','Karnataka'),
('KL','Kerala'),
('MP','Madhya Pradesh'),
('MH','Maharashtra'),
('MN','Manipur'),
('ME','Meghalaya'),
('MI','Mizoram'),
('ML','Nagaland'),
('OR','Odisha'),
('PB','Punjab'),
('RJ','Rajasthan'),
('SK','Sikkim'),
('TN','Tamil Nadu'),
('TS','Telangana'),
('TR','Tripura'),
('UP','Uttar Pradesh'),
('UT','Uttarakhand'),
('WB','West Bengal '),
('AN','Andaman and Nicobar Islands'),
('CH','Chandigarh'),
('DN','Dadra and Nagar Haveli'),
('DD','Daman and Diu'),
('DL','Delhi'),
('JK','Jammu and Kashmir'),
('LA','Ladakh'),
('LD','Lakshadweep'),
('PY','Puducherry');

INSERT INTO SeasonLOV (Code,Description) VALUES 
('YEARROUND','All year'),
('WINTER','Winter'),
('SUMMER','Summer'),
('MONSOON','Monsoon'),
('AUTUMN','Autumn');

CREATE TABLE IF NOT EXISTS SeasonRegionCalendar (
    -- static
    -- admin populated/curated table
    RegionCode NVARCHAR(10) NOT NULL,
    SeasonCode NVARCHAR(10) NOT NULL,
    TypicalStartMonth INTEGER,
    TypicalEndMonth INTEGER,
    Notes TEXT,
    PRIMARY KEY (RegionCode, SeasonCode),
    FOREIGN KEY (RegionCode) REFERENCES RegionLov(Code),
    FOREIGN KEY (SeasonCode) REFERENCES SeasonLov(Code)
);

/*
1. Create season and region lov in generic
2. Seed heir values
3. Create SeasonRegionCalendar
4. Create a scrip that crosses bothe and creats Season regioan calendar
5. Seach for each state or eregion and get the satart and end month, fill in
*/