const fs = require('fs')
const path = require('path')
const converImgToBase64 = function (fileName) {
  try {
    let file = path.join(__dirname, fileName)
    file = fs.readFileSync(file)

    const buffer = Buffer.from(file).toString('base64')
    console.log(buffer)
  } catch (e) {
    console.log('>>>>>>..e: ', e)
  }
}

converImgToBase64('./docker.png')

module.exports = {
  converImgToBase64
}
