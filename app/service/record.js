const Service = require('egg').Service

class RecordService extends Service {
  async add(payload) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    const { groupId, forWhom, paid, who: whoUuid, isDebtResolve } = payload
    delete payload.groupId

    if (forWhom.length < 1) {
      throw new Error('For whom length less than 1')
    }
    if (paid === 0) {
      throw new Error('Meaningless 0 amount')
    }

    const group = await this.ctx.model.Group.find(
      {
        id: groupId,
        $or: [
          {
            owner: userId,
          },
          {
            members: {
              $elemMatch: {
                id: { $eq: userId },
              },
            },
          },
        ],
      },
      {
        name: 1,
        tempUsers: 1,
      }
    )

    if (group.length < 1) {
      throw new Error('You are not in the group.')
    }

    const who = await this.ctx.model.User.find({
      uuid: whoUuid,
    })
    const whoId = who.length > 0 ? who[0]._id : undefined

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

    if (len >= 5000) {
      throw new Error('Reach group record limits.')
    }

    const forWhomIds = await this.ctx.model.User.find(
      {
        uuid: {
          $in: forWhom,
        },
      },
      {
        _id: 1,
        uuid: 1,
        pushToken: 1,
        name: 1,
      }
    )

    const avg = paid / forWhom.length

    // update last modified time
    await this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        modifiedAt: Date.now(),
      }
    )

    // update debt for each people
    for (const cur of forWhomIds) {
      const debt = -avg
      await this.ctx.model.Group.updateOne(
        {
          id: groupId,
        },
        {
          $inc: {
            'members.$[elem].debt': debt,
            'members.$[elem].cost': isDebtResolve ? 0 : avg,
          },
        },
        {
          arrayFilters: [
            {
              'elem.id': cur._id,
            },
          ],
        }
      )
      await this.ctx.model.User.updateOne(
        {
          _id: cur._id,
        },
        {
          $inc: { totalDebt: debt },
        }
      )
      // send notifications
      if (!cur?.pushToken) {
        continue
      }
      if (!isDebtResolve && cur._id === whoId) {
        continue
      }
      if (isDebtResolve && !who.length) {
        continue
      }
      const whoPaidName =
        who.length > 0
          ? who[0].name
          : group[0].tempUsers.find((e) => e.uuid === whoUuid).name
      const pushText = isDebtResolve
        ? `${cur.name}和解了债务，你需要支付${(avg / 100).toFixed(2)}`
        : `${whoPaidName}为你支付了${(avg / 100).toFixed(2)}`
      const pushToken = isDebtResolve ? who[0].pushToken : cur.pushToken
      this.ctx.service.push.pushText(pushToken, group[0].name, pushText)
    }
    // update debt for temp users
    for (const cur of forWhom) {
      const debt = -avg
      await this.ctx.model.Group.updateOne(
        {
          id: groupId,
        },
        {
          $inc: {
            'tempUsers.$[elem].debt': debt,
            'tempUsers.$[elem].cost': isDebtResolve ? 0 : avg,
          },
        },
        {
          arrayFilters: [
            {
              'elem.uuid': cur,
            },
          ],
        }
      )
    }
    // update for the one who paid
    await this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        $inc: { 'members.$[elem].debt': paid },
      },
      {
        arrayFilters: [
          {
            'elem.id': whoId,
          },
        ],
      }
    )
    await this.ctx.model.User.updateOne(
      {
        _id: whoId,
      },
      {
        $inc: { totalDebt: paid },
      }
    )
    // 如果检索不到对应的 ID，说明付款的人是 temp user
    if (who.length < 1) {
      await this.ctx.model.Group.updateOne(
        {
          id: groupId,
        },
        {
          $inc: { 'tempUsers.$[elem].debt': paid },
        },
        {
          arrayFilters: [
            {
              'elem.uuid': whoUuid,
            },
          ],
        }
      )
    }

    // insert record
    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        $push: {
          records: {
            who: whoUuid,
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
              members: {
                $elemMatch: {
                  id: { $eq: userId },
                },
              },
            },
          ],
        })
      ).length < 1
    ) {
      throw new Error('You are not in the group.')
    }

    const record = await this.ctx.model.Group.aggregate([
      {
        $match: {
          id: groupId,
        },
      },
      {
        $project: {
          records: 1,
        },
      },
      {
        $unwind: '$records',
      },
      {
        $match: {
          'records.recordId': recordId,
        },
      },
    ])

    const { forWhom, paid, who: whoUuid, isDebtResolve } = record[0].records

    const who = await this.ctx.model.User.find({
      uuid: whoUuid,
    })
    const whoId = who.length > 0 ? who[0]._id : undefined

    const forWhomIds = await this.ctx.model.User.find(
      {
        uuid: {
          $in: forWhom,
        },
      },
      {
        _id: 1,
        uuid: 1,
      }
    )

    const avg = paid / forWhom.length

    const del = await this.ctx.model.Group.updateOne(
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

    if (del.nModified < 1) {
      throw new Error('Record not exists')
    }

    // update debt for each person
    for (const cur of forWhomIds) {
      const debt = avg
      await this.ctx.model.Group.updateOne(
        {
          id: groupId,
        },
        {
          $inc: {
            'members.$[elem].debt': debt,
            'members.$[elem].cost': isDebtResolve ? 0 : -debt,
          },
        },
        {
          arrayFilters: [
            {
              'elem.id': cur._id,
            },
          ],
        }
      )
      await this.ctx.model.User.updateOne(
        {
          _id: cur._id,
        },
        {
          $inc: { totalDebt: debt },
        }
      )
    }
    // update debt for temp users
    for (const cur of forWhom) {
      const debt = avg
      await this.ctx.model.Group.updateOne(
        {
          id: groupId,
        },
        {
          $inc: {
            'tempUsers.$[elem].debt': debt,
            'tempUsers.$[elem].cost': isDebtResolve ? 0 : -debt,
          },
        },
        {
          arrayFilters: [
            {
              'elem.uuid': cur,
            },
          ],
        }
      )
    }
    // update for the one who paid
    await this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        $inc: { 'members.$[elem].debt': -paid },
      },
      {
        arrayFilters: [
          {
            'elem.id': whoId,
          },
        ],
      }
    )
    await this.ctx.model.User.updateOne(
      {
        _id: whoId,
      },
      {
        $inc: { totalDebt: -paid },
      }
    )

    // 如果检索不到对应的 ID，说明付款的人是 temp user
    if (who.length < 1) {
      await this.ctx.model.Group.updateOne(
        {
          id: groupId,
        },
        {
          $inc: { 'tempUsers.$[elem].debt': -paid },
        },
        {
          arrayFilters: [
            {
              'elem.uuid': whoUuid,
            },
          ],
        }
      )
    }

    return this.ctx.model.Group.updateOne(
      {
        id: groupId,
      },
      {
        modifiedAt: Date.now(),
      }
    )
  }

  async getById(recordId) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    return this.ctx.model.Group.aggregate([
      {
        $match: {
          $or: [
            {
              owner: userId,
            },
            {
              members: {
                $elemMatch: {
                  id: userId,
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          records: 1,
        },
      },
      {
        $unwind: '$records',
      },
      {
        $match: {
          'records.recordId': recordId,
        },
      },
      {
        $project: {
          _id: 0,
          who: '$records.who',
          paid: '$records.paid',
          forWhom: '$records.forWhom',
          type: '$records.type',
          text: '$records.text',
          long: '$records.long',
          lat: '$records.lat',
          recordId: '$records.recordId',
          createdAt: '$records.createdAt',
          modifiedAt: '$records.modifiedAt',
        },
      },
    ])
  }

  async getByGroupId(groupId) {
    const { _id } = this.ctx.token
    const userId = new this.app.mongoose.Types.ObjectId(_id)

    const { page, size } = this.ctx.pagination

    const t = await this.ctx.model.Group.aggregate([
      {
        $match: {
          $and: [
            {
              id: groupId,
            },
            {
              $or: [
                {
                  owner: userId,
                },
                {
                  members: {
                    $elemMatch: {
                      id: userId,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          size: {
            $size: '$records',
          },
        },
      },
    ])
    if (t.length < 1) {
      throw new Error('No records found')
    }
    this.ctx.pagination.total = t[0].size

    return this.ctx.model.Group.aggregate([
      {
        $match: {
          $and: [
            {
              id: groupId,
            },
            {
              $or: [
                {
                  owner: userId,
                },
                {
                  members: {
                    $elemMatch: {
                      id: userId,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          records: 1,
        },
      },
      {
        $unwind: '$records',
      },
      {
        $project: {
          _id: 0,
          who: '$records.who',
          paid: '$records.paid',
          forWhom: '$records.forWhom',
          type: '$records.type',
          text: '$records.text',
          long: '$records.long',
          lat: '$records.lat',
          recordId: '$records.recordId',
          createdAt: '$records.createdAt',
          modifiedAt: '$records.modifiedAt',
          isDebtResolve: '$records.isDebtResolve',
        },
      },
    ])
      .sort({ modifiedAt: -1 })
      .skip((page - 1) * size)
      .limit(size)
  }
}

module.exports = RecordService
