import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import connectDB from "../utils/db.js";

export const applyJob = async (req, res) => {
    try {
        await connectDB()
        const userId = req.id;
        const jobId = req.params.id;
        if (!jobId) {
            return res.status(400).json({
                message: "Job id is required.",
                success: false
            })
        };
        
        const existingApplication = await Application.findOne({ job: jobId, applicant: userId });

        if (existingApplication) {
            return res.status(400).json({
                message: "You have already applied for this jobs",
                success: false
            });
        }

        
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            })
        }
        
        const newApplication = await Application.create({
            job:jobId,
            applicant:userId,
        });

        job.applications.push(newApplication._id);
        await job.save();
        return res.status(201).json({
            message:"Job applied successfully.",
            success:true
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};
export const getAppliedJobs = async (req,res) => {
    try {
        await connectDB()
        const userId = req.id;
        const application = await Application.find({applicant:userId}).sort({createdAt:-1}).populate({
            path:'job',
            options:{sort:{createdAt:-1}},
            populate:{
                path:'company',
                options:{sort:{createdAt:-1}},
            }
        });
        if(!application){
            return res.status(404).json({
                message:"No Applications",
                success:false
            })
        };
        return res.status(200).json({
            application,
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

export const getApplicants = async (req,res) => {
    try {
        await connectDB()
        const jobId = req.params.id;
        const job = await Job.findById(jobId).populate({
            path:'applications',
            options:{sort:{createdAt:-1}},
            populate:{
                path:'applicant'
            }
        });
        if(!job){
            return res.status(404).json({
                message:'Job not found.',
                success:false
            })
        };
        return res.status(200).json({
            job, 
            succees:true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}
export const updateStatus = async (req,res) => {
    try {
        await connectDB()
        const {status} = req.body;
        const applicationId = req.params.id;
        if(!status){
            return res.status(400).json({
                message:'status is required',
                success:false
            })
        };

        
        const application = await Application.findOne({_id:applicationId});
        if(!application){
            return res.status(404).json({
                message:"Application not found.",
                success:false
            })
        };

        
        application.status = status.toLowerCase();
        await application.save();

        return res.status(200).json({
            message:"Status updated successfully.",
            success:true
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}


export const getAllApplicationsForRecruiter = async (req, res) => {
    try {
        await connectDB()
        const recruiterId = req.id; // Assuming req.id is the logged-in recruiter's ID

        
        const recruiterJobs = await Job.find({ created_by: recruiterId });
        const jobIds = recruiterJobs.map(job => job._id);

        
        const applications = await Application.find({ job: { $in: jobIds } })
            .populate({
                path: 'job',
                select: 'title', 
            })
            .populate({
                path: 'applicant',
                select: 'fullname email phoneNumber profile.resume profile.resumeOriginalName', 
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            applications,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};