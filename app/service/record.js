const Service = require('egg').Service

class RecordService extends Service {
  async add(payload) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    const { groupId } = payload
    delete payload.groupId

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
          $or: [
            {
              owner: userId,
            },
            {
              members: { $elemMatch: { $eq: userId } },
            },
          ],
        })
      ).length < 1
    ) {
      throw new Error('You are not in the group.')
    }

    const len = (
      await this.ctx.model.Group.aggregate([
        {
          $match: { id: groupId },
        },
        {
          $project: {
            total: { $size: '$records' },
          },
        },
      ])
    )[0].total

    if (len >= 500) {
      throw new Error('Reach group record limits.')
    }

    await this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        modifiedAt: Date.now(),
      }
    )

    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        $push: {
          records: {
            who: userId,
            ...payload,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
          },
        },
      }
    )
  }

  async drop(groupId, recordId) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
          $or: [
            {
              owner: userId,
            },
            {
              members: { $elemMatch: { $eq: userId } },
            },
          ],
        })
      ).length < 1
    ) {
      throw new Error('You are not in the group.')
    }

    await this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        modifiedAt: Date.now(),
      }
    )

    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        $pull: {
          records: {
            recordId,
          },
        },
      }
    )
  }

  async update(payload) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    const { groupId, recordId } = payload
    delete payload.groupId

    if (
      (
        await this.ctx.model.Group.find({
          id: groupId,
          $or: [
            {
              owner: userId,
            },
            {
              members: { $elemMatch: { $eq: userId } },
            },
          ],
        })
      ).length < 1
    ) {
      throw new Error('You are not in the group.')
    }

    await this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        modifiedAt: Date.now(),
      }
    )

    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
        records: {
          $elemMatch: {
            recordId,
          },
        },
      },
      {
        $set: { 'records.$': payload },
      }
    )
  }

  async my() {
    // const { _id } = this.ctx.token
    // const userId = new this.app.mongoose.Types.ObjectId(_id)
  }
}

module.exports = RecordService
