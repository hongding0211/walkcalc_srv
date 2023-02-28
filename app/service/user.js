const Service = require('egg').Service

const projection = {
  uuid: 1,
  name: 1,
  avatar: 1,
  _id: 0,
}

class UserService extends Service {
  findBySourceUid(sourceUid) {
    return this.ctx.model.User.find({
      source_uid: sourceUid,
    })
  }

  findByUuid(uuid) {
    return this.ctx.model.User.find(
      {
        uuid,
      },
      projection
    )
  }

  findById(_id) {
    return this.ctx.model.User.find(
      {
        _id,
      },
      projection
    )
  }

  findByUuids(uuids) {
    return this.ctx.model.User.find(
      {
        uuid: {
          $in: uuids,
        },
      },
      projection
    )
  }

  findByName(name) {
    return this.ctx.model.User.find(
      {
        name: {
          $regex: `${name}`,
          $options: 'i',
        },
      },
      projection
    ).limit(10)
  }

  add(user) {
    return this.ctx.model.User.insertMany([user])
  }
}

module.exports = UserService
