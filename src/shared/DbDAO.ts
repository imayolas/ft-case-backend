import Knex from "knex"

const Clickhouse = require("@apla/clickhouse")
const Dialect = require("knex/lib/dialects/postgres/index.js")

const knex = Knex({
  client: Dialect,
})

export interface IngestorRequestPayload {
  name: string
  value: number | string | boolean
}

interface ClickhouseClientParams {
  host: string
  port: number
  protocol: "http:" | "https:"
  pathname?: string
  timeout?: number
  queryOptions?: {
    database?: string
  }
  migrations?: {
    directory: string
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

const CLICKHOUSE_CLIENT_DEFAULT_PARAMS: ClickhouseClientParams = {
  host: "localhost",
  port: 8123,
  protocol: "http:",
  timeout: 30000,
  queryOptions: {
    database: "default",
  },
}

export default class DbDAO {
  private clickhouse: any

  private static validateInsertEventsPayload(payload: Partial<IngestorRequestPayload>): boolean | ValidationError {
    const { name, value } = payload

    if (!name) {
      throw new ValidationError("name is required")
    }

    if (!value) {
      throw new ValidationError("value is required")
    }

    if (typeof name !== "string") {
      throw new ValidationError("name should be a string")
    }

    if (!["string", "number", "boolean"].includes(typeof value)) {
      throw new ValidationError("value should be a string, number or boolean")
    }

    return true
  }

  constructor(clickhouseClientParams: Partial<ClickhouseClientParams>) {
    const params: ClickhouseClientParams = { ...CLICKHOUSE_CLIENT_DEFAULT_PARAMS, ...clickhouseClientParams }
    this.clickhouse = new Clickhouse(params)
  }

  get clickhouseClient() {
    return this.clickhouse
  }

  async insertEvent(payload: IngestorRequestPayload) {
    DbDAO.validateInsertEventsPayload(payload)

    // Use knex query builder to avoid any potential SQL injections
    const query = knex("events").insert(payload).toString()

    return await this.clickhouse.querying(query)
  }

  async raw(query: string) {
    return await this.clickhouse.querying(query)
  }
}
