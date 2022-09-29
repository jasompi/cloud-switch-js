import {
  ParticleCloud,
  ParticleDevice,
  ParticleEventStream,
  ParticlEvent,
} from './ParticleCloud'

export interface SwitchConfig {
  names: string[]
  codes: string[]
  timestamp: number
}

export type SwitchConfigChangedHandler = (timestamp: number) => void
export type SwitchStateChangedHandler = (index: number, state: boolean) => void

export class CloudSwitch {
  private configChangedEventStream: ParticleEventStream | undefined
  private stateChangedEventStream: ParticleEventStream | undefined

  public static async createCloudSwitchForId(
    deviceId: string,
    accessToken: string
  ): Promise<CloudSwitch> {
    const particleCloud = new ParticleCloud(accessToken)
    const cloudSwitchDevice = await particleCloud.getDevice(deviceId)
    return new CloudSwitch(cloudSwitchDevice)
  }

  public static async createCloudSwitchWithName(
    name: string,
    accessToken: string
  ): Promise<CloudSwitch> {
    const particleCloud = new ParticleCloud(accessToken)
    const devices = await particleCloud.listDevices()
    const cloudSwitchDevice = devices.find((device) => device.name === name)
    if (cloudSwitchDevice === undefined) {
      throw new Error(`Could not find device named: ${name}`)
    }
    return new CloudSwitch(cloudSwitchDevice)
  }

  public static async createCloudSwitch(
    accessToken: string
  ): Promise<CloudSwitch> {
    const particleCloud = new ParticleCloud(accessToken)
    const devices = await particleCloud.listDevices()
    const cloudSwitchDevice = devices.find(
      (device) => device.online && 'switchConfig' in device.variables
    )
    if (cloudSwitchDevice === undefined) {
      throw new Error('Could not find online CloudSwitch device')
    }
    return new CloudSwitch(cloudSwitchDevice)
  }

  public constructor(public readonly particleDevice: ParticleDevice) {}

  public name(): string {
    return this.particleDevice.name
  }

  public id(): string {
    return this.particleDevice.id
  }

  public isOnline(): boolean {
    return this.particleDevice.online
  }

  public async onSwitchConfigChanged(
    handler: SwitchConfigChangedHandler | undefined
  ): Promise<void> {
    if (handler !== undefined) {
      if (this.configChangedEventStream === undefined) {
        this.configChangedEventStream =
          await this.particleDevice.getEventStream('switchConfigChanged')
        this.configChangedEventStream.onEvent((event) => {
          handler(parseInt(event.data))
        })
      }
    } else {
      if (this.configChangedEventStream !== undefined) {
        this.configChangedEventStream.abort()
      }
    }
  }

  public async onSwitchStateChanged(
    handler: SwitchStateChangedHandler | undefined
  ): Promise<void> {
    if (handler !== undefined) {
      if (this.configChangedEventStream === undefined) {
        this.stateChangedEventStream = await this.particleDevice.getEventStream(
          'switchStateChanged'
        )
        this.stateChangedEventStream.onEvent((event) => {
          const switchIndex = parseInt(event.data)
          const switchState = event.data.charAt(2) === '1'
          handler(switchIndex, switchState)
        })
      }
    } else {
      if (this.configChangedEventStream !== undefined) {
        this.configChangedEventStream.abort()
      }
    }
  }

  public async setSwitchConfig(switchConfig: SwitchConfig): Promise<number> {
    const switchConfigStr = JSON.stringify(switchConfig)
    const result = await this.particleDevice.callFunction(
      'setSwitchConfig',
      switchConfigStr
    )
    return result
  }

  public async getSwitchConfig(): Promise<SwitchConfig> {
    const switchConfigStr = await this.particleDevice.getVariable<string>(
      'switchConfig'
    )
    const switchConfig: SwitchConfig = JSON.parse(switchConfigStr)
    return switchConfig
  }

  public async switchStates(): Promise<boolean[]> {
    const stateStr = await this.particleDevice.getVariable<string>(
      'switchState'
    )
    const switchState = stateStr.split(' ').map((s) => {
      return s === '1'
    })
    return switchState
  }

  private switchStateFromResult(result: number, switchIndex: number): boolean {
    switch (result) {
      case 0:
        return false
      case 1:
        return true
      default:
        throw new Error(`Invalid switchIndex: ${switchIndex}`)
    }
  }

  public async toggleSwitch(switchIndex: number): Promise<boolean> {
    const result = await this.particleDevice.callFunction(
      'toggleSwitch',
      `${switchIndex}`
    )
    return this.switchStateFromResult(result, switchIndex)
  }

  public async turnOnSwitch(switchIndex: number): Promise<boolean> {
    const result = await this.particleDevice.callFunction(
      'turnOnSwitch',
      `${switchIndex}`
    )
    return this.switchStateFromResult(result, switchIndex)
  }

  public async turnOffSwitch(switchIndex: number): Promise<boolean> {
    const result = await this.particleDevice.callFunction(
      'turnOffSwitch',
      `${switchIndex}`
    )
    return this.switchStateFromResult(result, switchIndex)
  }

  public async getSwitchState(switchIndex: number): Promise<boolean> {
    const result = await this.particleDevice.callFunction(
      'getSwitchState',
      `${switchIndex}`
    )
    return this.switchStateFromResult(result, switchIndex)
  }

  public async setSwitchState(
    switchIndex: number,
    isOn: boolean
  ): Promise<boolean> {
    const result = await this.particleDevice.callFunction(
      'setSwitchState',
      `${switchIndex} ${isOn ? '1' : '0'}`
    )
    return this.switchStateFromResult(result, switchIndex)
  }
}
