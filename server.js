require("dotenv").config();
const express = require("express");
const app = express();
const cors = require('cors');
const path = require("path");
const PORT = process.env.PORT;
const baseUrl = "/api/v1";
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const farmerRoutes = require("./routes/farmer.routes");
const buyerRoutes = require("./routes/buyer.routes");
const supportRoutes = require("./routes/support.routes");
const adminRoutes = require("./routes/admin.routes");


app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>{
    res.status(200).sendFile(path.join(__dirname,'public','index.html'));
});

app.use(baseUrl + "/support", supportRoutes);
app.use(baseUrl + "/auth/",authRoutes);
app.use(baseUrl + "/user/",userRoutes);
app.use(baseUrl + "/farmer/",farmerRoutes);
app.use(baseUrl + "/buyer/",buyerRoutes);   
app.use(baseUrl + "/admin/",adminRoutes);   



app.listen(PORT,() => {
    console.log(`App listening at port ${PORT}`);
});
