/**
 * Convert a integer(0 < n < 1679616 / 2) to a 4 digital code
 * @param num
 * @return {string}
 */
function numToString(num) {
  const binArr = num.toString(2).split('')
  const len = binArr.length
  for (let i = 0; i < 20 - len; i++) {
    binArr.unshift('0')
  }
  binArr.reverse()
  let str = parseInt(binArr.join(''), 2).toString(36)
  while (str.length < 4) {
    str = '0' + str
  }
  return str.toUpperCase()
}

module.exports = {
  numToString,
}
