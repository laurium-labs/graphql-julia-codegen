import Command from '@oclif/command'

export class CLI extends Command {
    static description = 'description of this example command'

    static flags = {
        source: {
            name: 'source file/folder',

        }
    }

    async run() {
        console.log('running my command!')
    }
}

export default CLI
