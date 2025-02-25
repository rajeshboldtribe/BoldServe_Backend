const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

const initializeAdmin = async () => {
    try {
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ userId: 'Admin' });
        
        if (!existingAdmin) {
            // Hash the password
            const hashedPassword = await bcrypt.hash('Admin123', 10);
            
            // Create new admin
            const admin = new Admin({
                userId: 'Admin',
                password: hashedPassword
            });
            
            await admin.save();
            console.log('✅ Admin user created successfully');
            console.log('👤 Admin credentials:');
            console.log('   UserId: Admin');
            console.log('   Password: Admin123');
        } else {
            console.log('ℹ️ Admin user already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing admin:', error);
        console.error(error.stack);
    }
};

module.exports = initializeAdmin;