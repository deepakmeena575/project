import { Job } from "../models/job.model.js";
import { Company } from "../models/company.model.js";
import connectDB from "../utils/db.js";


export const postJob = async (req, res) => {
    try {
        await connectDB()
        const { title, description, requirements, salary, location, jobType, experience, position, companyId } = req.body;
        const userId = req.id;

        if (!title || !description || !requirements || !salary || !location || !jobType || !experience || !position || !companyId) {
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            })
        };

        
        const parsedSalary = Number(salary);
        if (isNaN(parsedSalary) || parsedSalary <= 0) {
            return res.status(400).json({
                message: "Salary must be a valid positive number.",
                success: false
            });
        }

        const parsedPosition = Number(position);
        if (isNaN(parsedPosition) || parsedPosition <= 0) {
            return res.status(400).json({
                message: "Positions must be a valid positive number.",
                success: false
            });
        }

        const job = await Job.create({
            title,
            description,
            requirements: requirements.split(","),
            salary: parsedSalary,
            location,
            jobType,
            experienceLevel: experience,
            position: parsedPosition,
            company: companyId,
            created_by: userId
        });
        return res.status(201).json({
            message: "New job created successfully.",
            job,
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

export const getAllJobs = async (req, res) => {
    try {
        await connectDB()
        const { jobType, location, company, salary, experienceLevel } = req.query;
        console.log("Received query parameters:", req.query);
        let query = {};

        if (jobType) {
            query.jobType = jobType;
        }
        if (location) {
            query.location = { $regex: location, $options: "i" };
        }
        if (company) {
            const companyDoc = await Company.findOne({ name: { $regex: company, $options: "i" } });
            if (companyDoc) {
                query.company = companyDoc._id;
            } else {
                return res.status(200).json({
                    jobs: [],
                    success: true
                });
            }
        }
        if (salary) {
            const [minStr, maxStr] = salary.includes("-") ? salary.split("-") : [salary.replace("+", ""), null];
            let minSalary = 0;
            let maxSalary = Infinity;

            const parseSalary = (s) => {
                s = s.toLowerCase().trim();
                if (s.endsWith("k")) {
                    return parseFloat(s.slice(0, -1)) / 100; // Convert 'k' to LPA (assuming 1 lakh = 100k, so 40k = 0.4 LPA)
                } else if (s.endsWith("lakh")) {
                    return parseFloat(s.slice(0, -4)); // Already in lakhs
                } else if (s.includes("lakh to ")) {
                    const parts = s.split("lakh to ");
                    return [parseFloat(parts[0]), parseFloat(parts[1])];
                } else if (s.endsWith("lakh+")) {
                    return parseFloat(s.slice(0, -5));
                }
                return parseFloat(s);
            };

            if (minStr) {
                minSalary = parseSalary(minStr);
            }
            if (maxStr) {
                maxSalary = parseSalary(maxStr);
            } else if (salary.includes("+")) {
                minSalary = parseSalary(salary);
                maxSalary = Infinity; // For 5lakh+, set max to infinity
            }

            if (salary.includes("lakh to ")) {
                const [parsedMin, parsedMax] = parseSalary(salary);
                minSalary = parsedMin;
                maxSalary = parsedMax;
            }

            if (minSalary !== 0 || maxSalary !== Infinity) {
                query.salary = {};
                if (minSalary !== 0) {
                    query.salary.$gte = minSalary;
                }
                if (maxSalary !== Infinity) {
                    query.salary.$lte = maxSalary;
                }
            }
        }
        if (experienceLevel) {
            query.experienceLevel = experienceLevel;
        }

        console.log("Constructed Mongoose query:", query);
        const jobs = await Job.find(query).populate({
            path: "company"
        }).sort({ createdAt: -1 });
        if (!jobs) {
            return res.status(404).json({
                message: "Jobs not found.",
                success: false
            })
        };
        return res.status(200).json({
            jobs,
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

export const getJobById = async (req, res) => {
    try {
        await connectDB()
        const jobId = req.params.id;
        const job = await Job.findById(jobId).populate([
            { path: "applications" },
            { path: "company" }
        ]);
        if (!job) {
            return res.status(404).json({
                message: "Jobs not found.",
                success: false
            })
        };
        return res.status(200).json({ job, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

export const getAdminJobs = async (req, res) => {
    try {
        await connectDB()
        const adminId = req.id;
        const jobs = await Job.find({ created_by: adminId }).populate({
            path:'company',
            createdAt:-1
        });
        if (!jobs) {
            return res.status(404).json({
                message: "Jobs not found.",
                success: false
            })
        };
        return res.status(200).json({
            jobs,
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
