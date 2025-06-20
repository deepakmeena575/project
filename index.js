import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import applicationRoute from "./routes/application.route.js";
import Serverless from "serverless-http";

dotenv.config({});

const app = express();


app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
const corsOptions = {
    origin:'https://project-frontend-psi-green.vercel.app',
    
}

app.use(cors(corsOptions));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
res.json({ message: 'API is live!' })
})

app.use("/api/v1/user", userRoute);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/job", jobRoute);
app.use("/api/v1/application", applicationRoute);


connectDB();
export default Serverless(app);

