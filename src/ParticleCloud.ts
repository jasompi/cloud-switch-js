import Particle from 'particle-api-js'
import { EventEmitter } from 'stream'

const particle = new Particle()
type VariableType = string | number | boolean

export interface ParticleError extends Error {
  statusCode: number
  errorDescription: string
  shortErrorDescription: string
}

export interface ParticleDevice {
  id: string
  name: string
  online: boolean
  last_heard: Date
  functions: string[]
  variables: { [key: string]: string }
  toString: () => string
  callFunction: (name: string, argument: string) => Promise<number>
  getVariable: <T extends VariableType>(name: string) => Promise<T>
  getEventStream: (name: string) => Promise<ParticleEventStream>
}

export interface ParticlEvent {
  name: string
  data: string
  ttl: number
  published_at: Date
  coreid: string
}

export interface ParticleEventStream {
  abort: () => void
  onEvent: (handler: (event: ParticlEvent) => void) => this
  onError: (handler: (error: Error) => void) => this
  onDisconnect: (handler: () => void) => this
  onReconnect: (handler: () => void) => this
  onReconnectSuccess: (handler: () => void) => this
  onReconnectError: (handler: (error: Error) => void) => this
}

interface ParticleResponse {
  statusCode: number
  body: Object
}

interface FunctionResult {
  id: string
  name: string
  connected: boolean
  return_value: number
}

interface VariableResult<T extends VariableType> {
  name: string
  result: T
  coreInfo: {
    name: string
    deviceID: string
    connected: boolean
    last_handshake_at: Date
  }
}

interface ListDevicesResponse extends ParticleResponse {
  body: ParticleDevice[]
}

interface GetDeviceResponse extends ParticleResponse {
  body: ParticleDevice
}

interface CallFunctionResponse extends ParticleResponse {
  body: FunctionResult
}

interface GetVariableResponse<T extends VariableType> extends ParticleResponse {
  body: VariableResult<T>
}

interface EventStream extends EventEmitter {
  abort: () => void
}

class ParticleDeviceImp implements ParticleDevice {
  readonly id: string = ''
  readonly name: string = ''
  readonly online: boolean = false
  readonly last_heard: Date = new Date(0)
  readonly functions: string[] = []
  readonly variables: { [key: string]: string } = {}

  constructor(
    device: ParticleDevice,
    private readonly particleCloud: ParticleCloud
  ) {
    Object.assign(this, device)
  }

  toString(): string {
    return `${this.name} (${this.id})`
  }

  async callFunction(name: string, argument: string): Promise<number> {
    return await this.particleCloud.callFunction(this.id, name, argument)
  }

  async getVariable<T extends VariableType>(name: string): Promise<T> {
    return await this.particleCloud.getVariable<T>(this.id, name)
  }

  async getEventStream(name: string): Promise<ParticleEventStream> {
    return await this.particleCloud.getEventStream(this.id, name)
  }
}

class ParticleEventStreamImp implements ParticleEventStream {
  constructor(private readonly eventStream: EventStream) {}

  abort(): void {
    this.eventStream.abort()
  }

  onEvent(handler: (event: ParticlEvent) => void): this {
    this.eventStream.on('event', handler)
    return this
  }

  onError(handler: (error: Error) => void): this {
    this.eventStream.on('error', handler)
    return this
  }

  onDisconnect(handler: () => void): this {
    this.eventStream.on('disconnect', handler)
    return this
  }

  onReconnect(handler: () => void): this {
    this.eventStream.on('reconnect', handler)
    return this
  }

  onReconnectSuccess(handler: () => void): this {
    this.eventStream.on('reconnect-success', handler)
    return this
  }

  onReconnectError(handler: (error: Error) => void): this {
    this.eventStream.on('reconnect-error', handler)
    return this
  }
}

export class ParticleCloud {
  private readonly accessToken: string
  constructor(aceessToken: string) {
    this.accessToken = aceessToken
  }

  public async listDevices(): Promise<ParticleDevice[]> {
    const response: ListDevicesResponse = await particle.listDevices({
      auth: this.accessToken,
    })
    return response.body.map((dev) => {
      return new ParticleDeviceImp(dev, this)
    })
  }

  public async getDevice(deviceId: string): Promise<ParticleDevice> {
    const response: GetDeviceResponse = await particle.getDevice({
      deviceId,
      auth: this.accessToken,
    })
    return new ParticleDeviceImp(response.body, this)
  }

  public async callFunction(
    deviceId: string,
    name: string,
    argument: string
  ): Promise<number> {
    const response: CallFunctionResponse = await particle.callFunction({
      deviceId,
      name,
      argument,
      auth: this.accessToken,
    })
    return response.body.return_value
  }

  public async getVariable<T extends VariableType>(
    deviceId: string,
    name: string
  ): Promise<T> {
    const response: GetVariableResponse<T> = await particle.getVariable({
      deviceId,
      name,
      auth: this.accessToken,
    })
    return response.body.result
  }

  public async getEventStream(
    deviceID: string | undefined,
    name: string | undefined
  ): Promise<ParticleEventStream> {
    const response: EventStream = await particle.getEventStream({
      deviceID,
      name,
      auth: this.accessToken,
    })
    return new ParticleEventStreamImp(response)
  }
}
