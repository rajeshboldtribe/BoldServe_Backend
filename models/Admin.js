const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
});

// Add password comparison method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Initialize default admin method
adminSchema.statics.initializeDefaultAdmin = async function() {
  try {
    const adminCount = await this.countDocuments();
    if (adminCount === 0) {
      await this.create({
        userId: 'Admin',
        password: 'Admin123'
      });
      console.log('✅ Default admin account created');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
  }
};

const Admin = mongoose.model('Admin', adminSchema);

// Initialize default admin when the model is first loaded
Admin.initializeDefaultAdmin();

module.exports = Admin;