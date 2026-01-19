import readline from 'node:readline'

export class CLIInterface {
  constructor(messageHandler, peerStore = null, localProfile = null, historySync = null) {
    this.messageHandler = messageHandler
    this.peerStore = peerStore
    this.localProfile = localProfile
    this.historySync = historySync
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    })
  }

  async start() {
    console.log('P2P Chat Started!')
    console.log('Type messages and press Enter. Commands: /peers, /profiles, /history, /sync, /quit, /help\n')

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
      console.log('  /peers     - list known peers')
      console.log('  /profiles  - list known peer profiles')
      console.log('  /profile   - show local profile')
      console.log('  /history   - show recent messages (local)')
      console.log('  /sync      - request recent history from a peer')
      console.log('  /quit      - exit')
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
        console.log(
          `  ${p.id}  (lastSeen: ${new Date(p.lastSeen).toLocaleTimeString()}, ` +
          `status: ${p.status ?? 'unknown'})`
        )
      }
      return
    }

    if (cmd === '/profile') {
      if (!this.localProfile) {
        console.log('No local profile loaded')
        return
      }

      console.log('Local profile:')
      console.log(`  username: ${this.localProfile.username}`)
      console.log(`  publicKey: ${this.localProfile.publicKey.slice(0, 16)}...`)
      if (this.localProfile.bio) console.log(`  bio: ${this.localProfile.bio}`)
      return
    }

    if (cmd === '/profiles') {
      if (!this.peerStore) {
        console.log('Peer store not available')
        return
      }

      const peers = await this.peerStore.getAllPeers()
      const withProfiles = peers.filter(p => p.profile && p.profile.username)
      if (withProfiles.length === 0) {
        console.log('No peer profiles known yet')
        return
      }

      console.log('Known peer profiles:')
      for (const p of withProfiles) {
        console.log(
          `  ${p.id.slice(0, 8)} | ${p.profile.username}` +
          (p.profile.bio ? ` - ${p.profile.bio}` : '')
        )
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

    if (cmd === '/sync') {
      if (!this.historySync || !this.peerStore) {
        console.log('History sync not available')
        return
      }

      const peers = await this.peerStore.getAllPeers()
      const connected = peers.filter(p => p.status === 'connected')
      const target = (connected[0] ?? peers[0])
      if (!target) {
        console.log('No peers available to sync from')
        return
      }

      console.log(`Requesting history from ${target.id.slice(0, 8)}...`)
      const since = Date.now() - 5 * 60 * 1000 // last 5 minutes
      const messages = await this.historySync.requestHistory(since, 50, target.id)
      console.log(`Synced ${messages.length} messages`)
      return
    }

    console.log(`Unknown command: ${cmd}. Type /help for help.` )
  }

  displayMessage(message) {
    console.log(
      `\n[msg] ${new Date(message.timestamp).toLocaleTimeString()} ` +
      `${message.senderId.slice(0, 8)}: ${message.content}`
    )
    if (!this.rl.closed) {
      this.rl.prompt()
    }
  }
}
