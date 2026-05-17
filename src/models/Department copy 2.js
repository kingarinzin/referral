import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    remarks: { type: String, default: "" },
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Department || mongoose.model("Department", DepartmentSchema);