module.exports = (app) => {
  const mongoose = app.mongoose
  const Schema = mongoose.Schema

  const UserSchema = new Schema({
    uuid: { type: String },
    name: { type: String },
    source: { type: String },
    source_uid: { type: String },
    avatar: { type: String },
    totalDebt: { type: Number },
  })

  return mongoose.model('User', UserSchema)
}
