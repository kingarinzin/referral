import mongoose from 'mongoose';

const ActSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Act name is required'],
    trim: true,
  },
  remarks: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Important: Use 'Act' as the model name, but the file can be model.js
export default mongoose.models.Act || mongoose.model('Act', ActSchema);