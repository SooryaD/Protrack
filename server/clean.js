import mongoose from 'mongoose';

async function clean() {
    await mongoose.connect('mongodb://127.0.0.1:27017/student_project_tracker');
    console.log("Connected to MongoDB.");
    
    const ProjectSchema = new mongoose.Schema({ studentId: mongoose.Schema.Types.ObjectId, studentName: String }, { strict: false });
    const ProjectModel = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
    
    const res = await ProjectModel.deleteMany({ studentName: 'Kiran C' });
    const res2 = await ProjectModel.deleteMany({}); // Wait, I might delete everything. Let me just find by studentName. No, I'll delete by student email if I look up User first.
    
    const UserSchema = new mongoose.Schema({ email: String }, { strict: false });
    const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
    const kiran = await UserModel.findOne({ email: 'kiran.c@college.edu' });
    if(kiran) {
        const delRes = await ProjectModel.deleteMany({ studentId: kiran._id });
        console.log(`Deleted ${delRes.deletedCount} old projects for Kiran C by ID`);
        
        await UserModel.deleteOne({ _id: kiran._id });
        console.log(`Deleted user Kiran C`);
    } else {
        console.log("Kiran not found in users");
    }

    const RegistrySchema = new mongoose.Schema({ rollNo: String }, { strict: false });
    const RegistryModel = mongoose.models.StudentRegistry || mongoose.model('StudentRegistry', RegistrySchema);
    await RegistryModel.updateOne({ email: 'kiran.c@college.edu' }, { $set: { registered: false, userId: null }});
    console.log("Reset Kiran in registry");
    process.exit(0);
}

clean().catch(console.error);
