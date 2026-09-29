import chatHandler from './chat-handler.js'

export default async function handler(req, res) {
  return chatHandler(req, res)
}
