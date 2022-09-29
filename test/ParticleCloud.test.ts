import { gSwitchConfig, getTestSettings } from './testSettings'
import { ParticleCloud, ParticleDevice, ParticlEvent } from '../src/ParticleCloud'

beforeAll(() => {
  gSwitchConfig.timestamp = Math.round(Date.now() / 1000)
})

test('list devices', async () => {
  const settings = getTestSettings()
  const particleCloud = new ParticleCloud(settings.auth)
  const devices = await particleCloud.listDevices()
  expect(devices.length).toBeGreaterThan(0)

  for (const dev of devices) {
    expect(dev.name).toBeDefined()
    expect(dev.id).toBeDefined()
  }
})

test('get device by id', async () => {
  const settings = getTestSettings()
  const particleCloud = new ParticleCloud(settings.auth)
  const device: ParticleDevice = await particleCloud.getDevice(settings.deviceId)
  expect(device.name).toEqual(settings.deviceName)
  expect(device.online).toEqual(true)
  expect(device.functions.length).toBeGreaterThan(0)
  expect(Object.keys(device.variables).length).toBeGreaterThan(0)
})

test('call cloud function', async () => {
  const settings = getTestSettings()
  const particleCloud = new ParticleCloud(settings.auth)
  const device: ParticleDevice = await particleCloud.getDevice(settings.deviceId)

  const switchConfigStr = JSON.stringify(gSwitchConfig)
  const result = await device.callFunction('setSwitchConfig', switchConfigStr);
  expect(result).toEqual(0)
})

test('get cloud variable', async () => {
  const settings = getTestSettings()
  const particleCloud = new ParticleCloud(settings.auth)
  const device: ParticleDevice = await particleCloud.getDevice(settings.deviceId)
  const switchConfigStr = await device.getVariable<string>('switchConfig')
  const switchConfig = JSON.parse(switchConfigStr)
  expect(switchConfig).toEqual(gSwitchConfig)
})

test('call cloud function', async () => {
  const settings = getTestSettings()
  const particleCloud = new ParticleCloud(settings.auth)
  const device: ParticleDevice = await particleCloud.getDevice(settings.deviceId)
  expect(device.callFunction('setSwitchState', '3 0')).resolves.toEqual(0)
  expect(device.callFunction('setSwitchState', '3 1')).resolves.toEqual(1)
  expect(device.callFunction('setSwitchState', '3 0')).resolves.toEqual(0)
  expect(device.callFunction('setSwitchState', '5 1')).resolves.toEqual(-1)
})

test('subscribe event', async () => {
  jest.setTimeout(10000)
  const settings = getTestSettings()
  const particleCloud = new ParticleCloud(settings.auth)
  const device = await particleCloud.getDevice(settings.deviceId)
  const switchState = await device.callFunction('getSwitchState', '3')
  const newState = 1 - switchState

  const eventStream = await device.getEventStream('switchStateChanged')
  const stateChangePromise: Promise<ParticlEvent> = new Promise((resolve, reject) => {
    eventStream.onEvent((event: ParticlEvent) => {
      eventStream.abort()
      resolve(event)
    }).onError((error) => {
      console.log('event stream error:', error)
    }).onDisconnect(() => {
      console.log('Disconnected from Particle event stream')
    }).onReconnect(() => {
      console.log('Attempting to reconnect to Particle event stream')
    }).onReconnectSuccess(() => {
      console.log('Reconnected to Particle event stream')
    }).onReconnectError((error) => {
      console.log('Failed to reconnect to Particle event stream', error)
    })
  })
  expect(device.callFunction('toggleSwitch', '3')).resolves.toEqual(newState)

  const event = await stateChangePromise
  expect(event.name).toEqual('switchStateChanged')
  expect(event.data).toEqual(`3 ${newState}`)
  expect(device.callFunction('turnOffSwitch', '3')).resolves.toEqual(0)
})