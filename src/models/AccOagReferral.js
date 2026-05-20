import mongoose from 'mongoose';

const MeetingSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  type: { type: String, required: true },
  agenda: { type: String, default: '' },
  participants: { type: String, default: '' },
  minutes: { type: String, default: '' },
}, { timestamps: true });

const AccusedDetailSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cid: { type: String, required: true },
  actId: { type: mongoose.Schema.Types.ObjectId, ref: 'Act', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  chargeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Charge', required: true },
  prayer: { type: String, default: '' },
  counts: { type: Number, default: 1 },
});

const AccOagReferralSchema = new mongoose.Schema(
  {
    caseNo: { type: String, required: true, unique: true },
    caseDescription: { type: String, required: true },
    investigatorName: { type: String, required: true },
    investigatorDesignation: { type: String, default: '' },
    investigatorContact: { type: String, default: '' },
    attachments: [{ type: String }],
    accusedDetails: [AccusedDetailSchema],
    meetings: [MeetingSchema],
    status: { type: String, default: 'Pending' },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.AccOagReferral ||
  mongoose.model('AccOagReferral', AccOagReferralSchema);