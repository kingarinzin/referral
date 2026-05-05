// /src/models/Raa_Acc_Referral.js
import mongoose from "mongoose";

const RaaAccReferralSchema = new mongoose.Schema(
  {
    year: { type: String, required: true },
    ain_paro_no: { type: String, required: true },
    accountability_entity: { type: String, required: true },
    referral_no: { type: String, required: true },
    referral_date: { type: Date },
    status: { type: String, default: "Pending" },
  },
  { timestamps: true }
);

// Avoid recompilation in development
export default mongoose.models.RaaAccReferral || mongoose.model("RaaAccReferral", RaaAccReferralSchema);