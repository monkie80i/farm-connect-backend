ALTER TABLE CropVariety ADD COLUMN ImagePath TEXT;

UPDATE CropVariety
SET ImagePath = CASE Id
    WHEN 1  THEN '/uploads/1793249051182-194258240.png'       -- Nendran Banana
    WHEN 2  THEN '/uploads/1793249069064-931409079.jpeg'      -- Robusta Banana
    WHEN 3  THEN '/uploads/1793249092624-985773818.jpg'       -- Poovan Banana
    WHEN 4  THEN '/uploads/1793249161661-523700783.jpg'       -- West Coast Tall
    WHEN 5  THEN '/uploads/1793249181136-989130798.jpg'       -- Dwarf Green
    WHEN 6  THEN '/uploads/1793249201868-47638710.jpg'        -- Hybrid Coconut
    WHEN 7  THEN '/uploads/1793249227484-663835567.jpg'       -- Pippali
    WHEN 8  THEN '/uploads/1793249246940-244527531.jpg'       -- Kalluvally
    WHEN 10 THEN '/uploads/1788862297662-843292923.png'       -- Pusa Ruby (Tomato)
    WHEN 11 THEN '/uploads/1793249265567-621983055.png'       -- Byadagi Chilli
    WHEN 12 THEN '/uploads/1793249282145-349239.jpg'          -- Kashmiri Chilli
    WHEN 13 THEN '/uploads/1793249301383-130414098.jpg'       -- Suprabha Chilli
    WHEN 14 THEN '/uploads/1793249318704-322781498.jpeg'      -- Megha Chilli
    WHEN 15 THEN '/uploads/1793249333460-510644787.jpg'       -- New Coconut Variety One
    WHEN 17 THEN '/uploads/1793249333460-510644787.jpg'       -- Naadan Thenga
    ELSE ImagePath
END
WHERE Id IN (1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17);