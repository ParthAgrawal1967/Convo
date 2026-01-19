import express from "express";
import mongoose from "mongoose";
import {connectToSocket} from "./controllers/socketManager.js"

import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";

const app=express();
const server=createServer(app);
const io= connectToSocket(server);

app.set("port",(process.env.PORT || 8000));
app.use(cors());
app.use(express.json({limit: "40kb"}));
app.use(express.urlencoded({limit: "40kb", extended: true}));

app.use("/api/v1/users", userRoutes);

app.get("/home",(req,res)=>{
    return res.json({"hello":"world"})
});

const start = async() =>{
    const connectionDb =await mongoose.connect("mongodb+srv://parthagrawal1967_db_user:dFD6HmGB8fA5UWug@cluster0.3f2ihnx.mongodb.net/")
    console.log(`MONGO connected Db host ${connectionDb.connection.host}`)
    server.listen(app.get("port"),()=>{
     console.log("Listning on port 8000")
    });
}

start();