import mongoose from 'mongoose';

async function check() {
    await mongoose.connect('mongodb://localhost:27017/student_project_tracker');
    
    // Check user
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
    const user = await UserModel.findOne({ email: 'kiran.c@college.edu' });
    console.log("Kiran User:", user ? user.email : "NOT_FOUND");

    if (user) {
        const ProjectSchema = new mongoose.Schema({ studentId: mongoose.Schema.Types.ObjectId, studentName: String }, { strict: false });
        const ProjectModel = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
        const res = await ProjectModel.deleteMany({ studentId: user._id });
        console.log(`Deleted ${res.deletedCount} projects for Kiran`);
    }

    process.exit(0);
}

check().catch(console.error);
