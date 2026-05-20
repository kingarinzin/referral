import mongoose from 'mongoose';

const ChargeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Charge name is required'],
      trim: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.models.Charge || mongoose.model('Charge', ChargeSchema);