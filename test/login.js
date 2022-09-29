// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const helper = require('@particle/node-example-helper')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Particle = require('particle-api-js')

async function run() {
  if (!fs.existsSync('./config.js')) {
    fs.writeFileSync('./config.js', '')
  }
  await helper
    .withRootDir('./')
    .withConfig({
      authTokenLifeSecs: 3600 * 24 * 30,
      saveInteractiveToken: true,
    })
    .authenticate()

  if (
    helper.settings.deviceId === undefined ||
    helper.settings.deviceName === undefined
  ) {
    const particle = new Particle()
    const devices = await particle.listDevices({ auth: helper.auth })
    const devicesChoices = devices.body.map((dev) => `${dev.name}(${dev.id})`)
    const selected = await helper.questionMenu(
      'Select device for test:',
      devicesChoices
    )
    helper.settings.deviceId = devices.body[selected].id
    helper.settings.deviceName = devices.body[selected].name
    helper.saveSettings()
  }
  console.log(
    `Test device is ${helper.settings.deviceName}(${helper.settings.deviceId})`
  )
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
