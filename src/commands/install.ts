import { Command } from '/types.d.ts'

import * as flags from '/core/flags.ts'

export const Install: Command = {
  name: 'install',

  aliases: ['i'],

  flags: {
    target: flags.string()
  },

  run: (args) => {
    console.log('hello world')
    console.log(args)
  }
}
