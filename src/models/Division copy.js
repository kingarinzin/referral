
import mongoose from "mongoose";

const DivisionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Division || mongoose.model("Division", DivisionSchema);