import readline from 'node:readline'

export class CLIInterface {
  constructor(messageHandler, peerStore = null) {
    this.messageHandler = messageHandler
    this.peerStore = peerStore
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    })
  }

  async start() {
    console.log('P2P Chat Started!')
    console.log('Type messages and press Enter. Commands: /peers, /history, /quit, /help\n')

    this.rl.prompt()

    this.rl.on('line', async (line) => {
      const input = line.trim()

      if (input.startsWith('/')) {
        await this.handleCommand(input)
      } else if (input) {
        await this.messageHandler.send(input)
      }

      this.rl.prompt()
    })
  }

  async handleCommand(cmd) {
    if (cmd === '/quit') {
      console.log('Exiting...')
      process.exit(0)
    }

    if (cmd === '/help') {
      console.log('Commands:')
      console.log('  /peers   - list known peers')
      console.log('  /history - show recent messages (local)')
      console.log('  /quit    - exit')
      return
    }

    if (cmd === '/peers') {
      if (!this.peerStore) {
        console.log('Peer store not available')
        return
      }

      const peers = await this.peerStore.getAllPeers()
      if (peers.length === 0) {
        console.log('No known peers yet')
        return
      }

      console.log('Known peers:')
      for (const p of peers) {
        console.log(`  ${p.id}  (lastSeen: ${new Date(p.lastSeen).toLocaleTimeString()}, status: ${p.status ?? 'unknown'})`)
      }
      return
    }

    if (cmd === '/history') {
      if (!this.messageHandler.messageStore) {
        console.log('Message store not available')
        return
      }

      const messages = await this.messageHandler.messageStore.getRecentMessages(20)
      if (messages.length === 0) {
        console.log('No messages stored yet')
        return
      }

      console.log('Recent messages:')
      for (const m of messages) {
        console.log(
          `[${new Date(m.timestamp).toLocaleTimeString()}] ` +
          `${m.senderId?.slice(0, 8) ?? 'unknown'}: ${m.content}`
        )
      }
      return
    }

    console.log(`Unknown command: ${cmd}. Type /help for help.` )
  }

  displayMessage(message) {
    console.log(
      `\n[msg] ${new Date(message.timestamp).toLocaleTimeString()} ` +
      `${message.senderId.slice(0, 8)}: ${message.content}`
    )
    this.rl.prompt()
  }
}
