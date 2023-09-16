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
        meta: 1,
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

    // send notifications
    const pushQueue = []
    const groupName = group[0].name
    const recordText = payload?.text ? `(${payload.text})` : ''
    const requesterName = (
      await this.ctx.model.User.find({
        _id: userId,
      })
    )[0].name
    const amount = (avg / 100).toFixed(2)
    const totalAmount = (paid / 100).toFixed(2)

    if (!isDebtResolve) {
      forWhomIds.forEach((target) => {
        // 如果这个对象没有 token，直接返回
        if (!target?.meta?.pushToken) {
          return
        }
        // 不要给发送这个请求的人推送
        if (userId.equals(target._id)) {
          return
        }
        // 如果这个人是付钱的那个，也不要推送
        if (whoId.equals(target._id)) {
          return
        }
        // 告诉剩下的人，别人为他们支付了多少钱
        pushQueue.push({
          pushToken: target.meta.pushToken,
          pushText: `${who[0].name}为你支付了${amount}` + recordText,
        })
      })
      // 告诉付款的人，他为大家支付了多少钱
      if (whoId && !whoId.equals(userId) && who[0]?.meta?.pushToken) {
        const names = forWhomIds
          .filter((e) => e._id !== whoId)
          .map((e) => e.name)
        const namesText = names.length
          ? names.slice(0, 2).join(', ') + (names.length > 2 ? '等人' : '')
          : ''
        pushQueue.push({
          pushToken: who[0].meta.pushToken,
          pushText: namesText
            ? `你为${namesText}支付了${totalAmount}` + recordText
            : `你支付了${totalAmount}` + recordText,
        })
      }
    } else {
      // 告诉需要“还钱的人”，要给谁多少钱
      if (whoId && who[0]?.meta?.pushToken && !whoId.equals(userId)) {
        let targetUserName
        if (forWhomIds.length) {
          // 收钱的人是正式用户
          targetUserName = forWhomIds[0].name
        } else {
          // 收钱的人是临时用户
          targetUserName = group.tempUsers.find(
            (e) => e.uuid === forWhom[0].uuid
          ).name
        }
        pushQueue.push({
          pushToken: who[0].meta.pushToken,
          pushText: `${requesterName}和解了债务，你需要向${targetUserName}支付${amount}`,
        })
      }
      // 告诉债主，谁要向他还钱
      if (forWhomIds.length && forWhomIds[0]?.meta?.pushToken) {
        let payUserName
        if (who.length) {
          // 要还钱的人是正式用户
          payUserName = who[0].name
        } else {
          // 要还钱的人是临时用户
          payUserName = group.tempUsers.find((e) => e.uuid === whoUuid).name
        }
        pushQueue.push({
          pushToken: forWhomIds[0].meta.pushToken,
          pushText: `${requesterName}和解了债务，${payUserName}需要向你支付${amount}`,
        })
      }
    }

    pushQueue.forEach((p) => {
      this.ctx.service.push.pushText(p.pushToken, groupName, p.pushText)
    })

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
