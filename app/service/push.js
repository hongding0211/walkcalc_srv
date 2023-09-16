const Service = require('egg').Service
const apn = require('apn')

const provider = new apn.Provider({
  token: {
    key: 'app/public/AuthKey_85MLTDWVAK.p8',
    keyId: '85MLTDWVAK',
    teamId: 'Q46TPB6WXW',
  },
  production: true,
})

class PushService extends Service {
  pushText(pushToken, title, body) {
    const notification = new apn.Notification()
    notification.alert = {
      title,
      body,
    }
    notification.sound = 'default'
    notification.topic = 'ltd.hong97.walkingcalc'
    provider.send(notification, pushToken).then()
  }
}

module.exports = PushService
