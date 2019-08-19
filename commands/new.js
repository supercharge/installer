'use strict'

const Fs = require('fs')
const Path = require('path')
const Listr = require('listr')
const Execa = require('execa')
const { promisify } = require('util')
const readDir = promisify(Fs.readdir)
const readFile = promisify(Fs.readFile)
const writeFile = promisify(Fs.writeFile)
const { Command } = require('@adonisjs/ace')

class New extends Command {
  constructor () {
    super()

    this.appPath = null
    this.blueprint = 'git@github.com:superchargejs/supercharge.git'
  }

  static get signature () {
    return `new
      { name: The name of your application directory }
    `
  }

  static get description () {
    return 'Create a new Supercharge application'
  }

  /**
   * Create a new, greenfield Supercharge project.
   *
   * @param {Object} parameters
   */
  async handle ({ name }) {
    try {
      this.appPath = Path.resolve(process.cwd(), name)

      this.success('Crafting a new Supercharge application\n')

      const tasks = new Listr([
        {
          title: 'Ensure installation directory is empty',
          task: () => this.ensureEmptyInstallPath(name)
        },
        {
          title: 'Crafting your application',
          task: () => this.craftApp()
        },
        {
          title: 'Install application dependencies',
          task: () => this.installAppDependencies()
        },
        {
          title: 'Initialize application setup',
          task: () => Promise.resolve()
        }
      ])

      await tasks.run()
      await this.runAppSetup(name)

      this.success('\nEnjoy the ride!')
    } catch (error) {
      this.prettyPrintError(error)
      process.exit(1)
    }
  }

  /**
   * Ensure the installation directory doesn’t exist yet.
   *
   * @param {String} appName
   *
   * @throws
   */
  async ensureEmptyInstallPath (appName) {
    if (!await this.pathExists(this.appPath)) {
      return
    }

    const files = await readDir(this.appPath)

    if (files.length > 0) {
      throw new Error(`The install directory is not empty. Cannot install into "${appName}".`)
    }
  }

  /**
   * Clone the blueprint to local disk
   * and remove the `.git` folder.
   */
  async craftApp () {
    await Execa('git', ['clone', '--depth=1', this.blueprint, this.appPath])
    await this.removeDir(Path.resolve(this.appPath, '.git'))
    await this.resetVersion()
  }

  /**
   * Reset the default Supercharge applicaiton
   * and set it to `0.0.0`.
   */
  async resetVersion () {
    const pkgPath = Path.resolve(this.appPath, 'package.json')

    const pkg = JSON.parse(
      await readFile(pkgPath, 'utf8')
    )

    pkg.version = '0.0.0'

    await writeFile(pkgPath, JSON.stringify(pkg, null, 2))
  }

  /**
   * Run `npm install`.
   */
  async installAppDependencies () {
    return Execa('npm', ['install'], { cwd: this.appPath })
  }

  /**
   * Run the `node craft setup` command to
   * create a `.env` file and generate
   * an application key.
   *
   * @param {String} name
   */
  async runAppSetup (name) {
    return Execa('node', ['craft', 'setup', `--name=${name}`], {
      stdin: 'inherit',
      stdout: 'inherit',
      cwd: this.appPath
    })
  }

  /**
   * Pretty print the error message.
   *
   * @param {Object} error
   */
  prettyPrintError (error) {
    console.error(`\n  ${this.chalk.bgRed.white(' Error ')} ${this.chalk.red(error.message)}\n`)
  }
}

module.exports = New
