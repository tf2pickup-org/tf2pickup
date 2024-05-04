import { MongoClient } from 'mongodb'
import { environment } from '../environment'

export const client = new MongoClient(environment.MONGODB_URI)
await client.connect()
