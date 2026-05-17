import mongoose from "mongoose";

const AgencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Agency || mongoose.model("Agency", AgencySchema);