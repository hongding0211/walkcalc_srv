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

  async findById(_id) {
    const f = await this.ctx.model.User.find(
      {
        _id,
      },
      {
        ...projection,
        source_uid: 1,
      }
    )
    if (f.length < 1) {
      return []
    }
    const userData = await this.ctx.service.oauth.sso.getUserData(
      undefined,
      f[0].source_uid
    )
    if (
      !userData.avatar ||
      !userData.name ||
      (userData.avatar === f[0].avatar && userData.name === f[0].name)
    ) {
      return [
        {
          uuid: f[0].uuid,
          name: f[0].name,
          avatar: f[0].avatar,
        },
      ]
    }
    // update userInfo
    await this.ctx.model.User.updateOne(
      {
        _id,
      },
      {
        uuid: f[0].uuid,
        avatar: userData.avatar,
        name: userData.name,
      }
    )
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

  myDebt() {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    return this.ctx.model.User.find(
      {
        _id: userId,
      },
      {
        totalDebt: 1,
      }
    )
  }

  async patchInfo(userInfo) {
    const { _id } = this.ctx.token
    const originUserInfo = this.ctx.model.User.find(
      {
        _id,
      },
      projection
    )[0]
    await this.ctx.model.User.updateOne(
      {
        _id,
      },
      {
        ...originUserInfo,
        ...userInfo,
      }
    )
    return {
      ...originUserInfo,
      ...userInfo,
    }
  }

  async updateUserMeta(meta) {
    const { _id } = this.ctx.token
    const f = await this.ctx.model.User.find({
      _id,
    })
    if (f.length < 1) {
      throw new Error('Invalid user id')
    }
    return await this.ctx.model.User.updateOne(
      {
        _id,
      },
      {
        meta,
      }
    )
  }
}

module.exports = UserService
