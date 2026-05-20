import mongoose from 'mongoose';

const SectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
    },
    actId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Act',
      required: [true, 'Act is required'],
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.models.Section || mongoose.model('Section', SectionSchema);