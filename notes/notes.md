1. A FILE CONTAainnng the list of names of LOV tables - the LOV list
    if any name is added, it wiill be created. Not automatically dropped.
    [    for later
        you can get all tables with code and discription only. check if you want to keep or delete that.
        you should check before any delete table command if its an LOV table, just check the LOV list

    ]

2. hwo will a migration be  
    - sql file
    - just sql comnads, and no JS
    - seed are independant files that can be executed

3. Currunt Migrations
    - it looks through only the migrations folder and execute files that were not previousely executed
    - it doesnt look for LOV files

4. New Migration   
    - should have existing migration, plus LOV migrations
    - if explicitely not mentioned , it will do both
    - can also individually run, main tables and LOV table migrations separately
    (const args = process.argv.slice(2); )

5. Objective, replace original db with new db, will all the exact tables structre and data, but with new migration method.
    - dump all currunt data from farm connect
    - create new farmconnect db
    - run migrations on new farm connect db
    - seed all the dumped data to farm connect

6. make the migrations correct in V2. - done

7. we need a tracker for load


