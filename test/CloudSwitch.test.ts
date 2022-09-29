import { gSwitchConfig, getTestSettings, waitFor } from './testSettings'
import { CloudSwitch } from '../src'

beforeAll(() => {
  gSwitchConfig.timestamp = Math.round(Date.now() / 1000)
})

test('create cloud switch by id', async () => {
  const settings = getTestSettings()
  const cloudSwitch = await CloudSwitch.createCloudSwitchForId(settings.deviceId, settings.auth)
  expect(cloudSwitch.name()).toEqual(settings.deviceName)
  expect(cloudSwitch.id()).toEqual(settings.deviceId)
  expect(cloudSwitch.isOnline()).toEqual(true)
})

test('create cloud switch with name', async () => {
  const settings = getTestSettings()
  const cloudSwitch = await CloudSwitch.createCloudSwitchWithName(settings.deviceName, settings.auth)
  expect(cloudSwitch.name()).toEqual(settings.deviceName)
  expect(cloudSwitch.id()).toEqual(settings.deviceId)
  expect(cloudSwitch.isOnline()).toEqual(true)
})

test('create cloud switch', async () => {
  const settings = getTestSettings()
  const cloudSwitch = await CloudSwitch.createCloudSwitch(settings.auth)
  expect(cloudSwitch.name()).toEqual(settings.deviceName)
  expect(cloudSwitch.id()).toEqual(settings.deviceId)
  expect(cloudSwitch.isOnline()).toEqual(true)
})

test('change cloud switch config', async () => {
  const settings = getTestSettings()
  const cloudSwitch = await CloudSwitch.createCloudSwitchForId(settings.deviceId, settings.auth)
  const timestampPromise: Promise<number> = new Promise((resolve, reject) => {
    return cloudSwitch.onSwitchConfigChanged((timestamp) => {
      resolve(timestamp)
    })
  });
  expect(cloudSwitch.setSwitchConfig(gSwitchConfig)).resolves.toEqual(0)
  expect(timestampPromise).resolves.toEqual(gSwitchConfig.timestamp)
  waitFor(100)
  expect(cloudSwitch.getSwitchConfig()).resolves.toEqual(gSwitchConfig)
  cloudSwitch.onSwitchConfigChanged(undefined)
})

test('change cloud switch state', async () => {
  jest.setTimeout(10000)
  const settings = getTestSettings()
  const cloudSwitch = await CloudSwitch.createCloudSwitchForId(settings.deviceId, settings.auth)
  let switchStates: boolean[] = new Array<boolean>(false, false, false, false, false)
  for (let i = 0; i < 5; i++) {
    expect(cloudSwitch.setSwitchState(i, false)).resolves.toEqual(false)
  }
  await waitFor(100)
  expect(cloudSwitch.switchStates()).resolves.toEqual(switchStates)

  let count = 0;
  const stateChangePromise: Promise<void> = new Promise((resolve, reject) => {
    return cloudSwitch.onSwitchStateChanged((switchIndex: number, state: boolean) => {
      expect(switchIndex).toEqual(1)
      expect(state).toEqual(count == 0)
      if (++count === 2) {
        resolve()
      }
    })
  });
  expect(cloudSwitch.toggleSwitch(1)).resolves.toEqual(true)
  await waitFor(100)
  expect(cloudSwitch.turnOnSwitch(1)).resolves.toEqual(true)
  await waitFor(100)
  switchStates[1] = true
  expect(cloudSwitch.switchStates()).resolves.toEqual(switchStates)

  expect(cloudSwitch.toggleSwitch(1)).resolves.toEqual(false)
  await waitFor(100)
  expect(cloudSwitch.turnOffSwitch(1)).resolves.toEqual(false)
  switchStates[1] = false
  await waitFor(100)
  expect(cloudSwitch.switchStates()).resolves.toEqual(switchStates)

  expect(cloudSwitch.toggleSwitch(5)).rejects.toThrow()

  await stateChangePromise
  cloudSwitch.onSwitchStateChanged(undefined)
  await new Promise(process.nextTick)
})

