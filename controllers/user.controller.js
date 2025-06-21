import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import connectDB from "../utils/db.js";

export const register = async (req, res) => {
    try {

        await connectDB();
        const { fullname, email, phoneNumber, password, role } = req.body;
         
        if (!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        };
        const file = req.file;
        const fileUri = getDataUri(file);
        const cloudResponse = await cloudinary.uploader.upload(fileUri.content);

        console.log("cloud", cloudResponse)
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                message: 'User already exist with this email.',
                success: false,
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            fullname,
            email,
            phoneNumber,
            password: hashedPassword,
            role,
            profile:{
                profilePhoto:cloudResponse.secure_url,
            }
        });

        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}
export const login = async (req, res) => {
    try {
        await connectDB();
        const { email, password, role } = req.body;
        
        if (!email || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        };
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            })
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            })
        };
        
        if (role !== user.role) {
            return res.status(400).json({
                message: "Account doesn't exist with current role.",
                success: false
            })
        };

        const tokenData = {
            userId: user._id
        }
        const token = await jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '1d' });

        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        }

        return res
        .status(200)
        .cookie("token", token, {
            maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
            httpOnly: true,                 // ✅ blocks JS access
            secure: process.env.NODE_ENV === "production", // ✅ HTTPS only in production
            sameSite: "Strict",             // ✅ prevents CSRF
            path: "/"                       // optional but good practice
        })
        .json({
            message: `Welcome back ${user.fullname}`,
            user,
            token,
            success: true,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}
export const logout = async (req, res) => {
    try {
        await connectDB();
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}
export const updateProfile = async (req, res) => {
    try {
        await connectDB();
        const { fullname, email, phoneNumber, bio, skills } = req.body;
        
        const resumeFile = req.files['file'] ? req.files['file'][0] : null; // Access resume file
        const profilePhotoFile = req.files['profilePhoto'] ? req.files['profilePhoto'][0] : null; // Access profile photo file

        let resumeCloudResponse;
        if (resumeFile) {
            const resumeFileUri = getDataUri(resumeFile);
            resumeCloudResponse = await cloudinary.uploader.upload(resumeFileUri.content, {
                resource_type: "raw"
            });
        }

        let profilePhotoCloudResponse;
        if (profilePhotoFile) {
            const profilePhotoFileUri = getDataUri(profilePhotoFile);
            profilePhotoCloudResponse = await cloudinary.uploader.upload(profilePhotoFileUri.content);
        }

        let skillsArray;
        if(skills){
            skillsArray = skills.split(",");
        }
        const userId = req.id; // middleware authentication
        let user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({
                message: "User not found.",
                success: false
            })
        }
        // updating data
        if(fullname) user.fullname = fullname
        if(email) user.email = email
        if(phoneNumber)  user.phoneNumber = phoneNumber
        if(bio) user.profile.bio = bio
        if(skills) user.profile.skills = skillsArray
      
        // resume comes later here...
        if(resumeCloudResponse){
            user.profile.resume = resumeCloudResponse.secure_url // save the cloudinary url
            user.profile.resumeOriginalName = resumeFile.originalname // Save the original file name
        }

        // Update profile photo
        if (profilePhotoCloudResponse) {
            user.profile.profilePhoto = profilePhotoCloudResponse.secure_url;
        }

        await user.save();

        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        }

        return res.status(200).json({
            message:"Profile updated successfully.",
            user,
            success:true
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}