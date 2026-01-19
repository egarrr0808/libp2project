export class RateLimiter {
  constructor(maxMessages = 10, timeWindow = 60_000) {
    this.maxMessages = maxMessages
    this.timeWindow = timeWindow
    this.peerMessages = new Map()
  }

  canSend(peerId) {
    const now = Date.now()
    const history = this.peerMessages.get(peerId) ?? []

    const recent = history.filter((t) => now - t < this.timeWindow)
    if (recent.length >= this.maxMessages) {
      return false
    }

    recent.push(now)
    this.peerMessages.set(peerId, recent)
    return true
  }
}
