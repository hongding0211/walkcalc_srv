const jwt = require('jsonwebtoken')
const CryptoJS = require('crypto-js')

const tokenKey =
  'U2FsdGVkX19Eplk5nQHwc5FlOvcCZjIWkPdLMx3DYI59RYEI72qTu8Y2lvmdCj1r2m7Z1VxF+i+Bfd9KLIIVdA=='

/**
 * @param {any} data data
 * @return {string} token token
 */
const wrap = (data) => {
  const k = `${Math.floor(Date.now() / (2 * 60 * 1000))}_${tokenKey}`
  const v = JSON.stringify(data)

  const encryptedData = {
    data: CryptoJS.AES.encrypt(v, k).toString(),
  }

  return jwt.sign(encryptedData, k, {
    expiresIn: '180d',
  })
}

/**
 *  @param {string} token token
 *  @return {any} data data
 */
const unwrap = (token) => {
  const { iat } = jwt.decode(token)
  const k = `${Math.floor(iat / (2 * 60))}_${tokenKey}`
  const { data } = jwt.verify(token, k)
  if (!data) {
    return null
  }
  const decryptedData = CryptoJS.AES.decrypt(data, k)
  return {
    ...JSON.parse(decryptedData.toString(CryptoJS.enc.Utf8)),
  }
}

module.exports = {
  wrap,
  unwrap,
}
