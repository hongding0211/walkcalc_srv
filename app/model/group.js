module.exports = (app) => {
  const mongoose = app.mongoose
  const Schema = mongoose.Schema

  const GroupSchema = new Schema({
    id: { type: String },
    owner: { type: Schema.Types.ObjectId },
    name: { type: String },
    members: { type: Array },
    records: { type: Array },
    createdAt: { type: Number },
    modifiedAt: { type: Number },
    tempUsers: { type: Array },
  })

  return mongoose.model('Group', GroupSchema)
}
