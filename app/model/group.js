module.exports = (app) => {
  const mongoose = app.mongoose
  const Schema = mongoose.Schema

  const GroupSchema = new Schema({
    id: { type: String },
    owner: { type: Schema.Types.ObjectId },
    members: { type: Array },
    record: { type: Array },
    createdAt: { type: Number },
    modifiedAt: { type: Number },
  })

  return mongoose.model('Group', GroupSchema)
}
