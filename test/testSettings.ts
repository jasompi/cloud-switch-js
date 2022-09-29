import fs from 'fs'
import { SwitchConfig } from '../src'

export interface Settings {
  auth: string
  deviceId: string
  deviceName: string
}
const timeStamp = Math.round(Date.now() / 1000)

export const gSwitchConfig: SwitchConfig = {
  names: ['test 1', 'test 2', 'test 3', 'test 4', 'test 5'],
  codes: [
    '1F11FFF00001 166 1',
    '1F11FFF00010 166 1',
    '1F11FFF00100 166 1',
    '1F11FFF01000 166 1',
    '1F11FFF10000 165 1',
  ],
  timestamp: timeStamp,
}

export function getTestSettings(): Settings {
  const settings = JSON.parse(
    fs.readFileSync('./settings.json', 'utf-8')
  ) as Settings
  expect(settings.auth).toBeDefined()
  expect(settings.deviceId).toBeDefined()
  return settings
}

export async function waitFor(timeout: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout))
}
