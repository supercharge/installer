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
const Slugify = require('@sindresorhus/slugify')

class NewCommand extends Command {
  constructor () {
    super()

    this.appName = null
    this.appPath = null
    this.blueprint = 'https://github.com/superchargejs/supercharge.git'
  }

  /**
   * Returns the command signature.
   *
   * @returns {String}
   */
  static get signature () {
    return `new
      { name: The name of your application directory }
    `
  }

  /**
   * Returns the command description.
   *
   * @returns {String}
   */
  static get description () {
    return 'Create a new Supercharge application'
  }

  /**
   * Create a new, fresh Supercharge project.
   *
   * @param {Object} parameters
   */
  async handle ({ name }) {
    try {
      this.appName = name
      this.appPath = Path.resolve(process.cwd(), this.appName)

      this.success('Crafting a new Supercharge application\n')

      await this.createApp()
      await this.runAppSetup()

      this.success('\nEnjoy the ride!')
    } catch (error) {
      this.prettyPrintError(error)
      process.exit(1)
    }
  }

  /**
   * Run the individual steps to create a new Supercharge app.
   */
  async createApp () {
    const tasks = new Listr([
      {
        title: 'Ensure installation directory is empty',
        task: () => this.ensureEmptyInstallPath()
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
  }

  /**
   * Ensure the installation directory doesn’t exist yet.
   *
   * @throws
   */
  async ensureEmptyInstallPath () {
    if (!await this.pathExists(this.appPath)) {
      return
    }

    const files = await readDir(this.appPath)

    if (files.length > 0) {
      throw new Error(`The install directory is not empty. Cannot install into "${this.appName}".`)
    }
  }

  /**
   * Clone the blueprint to local disk
   * and remove the `.git` folder.
   */
  async craftApp () {
    await Execa('git', ['clone', '--depth=1', this.blueprint, this.appPath])
    await this.removeDir(Path.resolve(this.appPath, '.git'))
    await this.setAppName()
    await this.resetVersion()
    await this.resetDescription()
  }

  /**
   * Inject a new app name based on the scaffolding name.
   */
  async setAppName () {
    const pkg = await this.getPackageJson()

    pkg.name = Slugify(this.appName)

    await this.savePackageJson(pkg)
  }

  /**
   * Set the app version to `0.0.0`.
   */
  async resetVersion () {
    const pkg = await this.getPackageJson()

    pkg.version = '0.0.0'

    await this.savePackageJson(pkg)
  }

  /**
   * Set an empty app description.
   */
  async resetDescription () {
    const pkg = await this.getPackageJson()

    pkg.description = ''

    await this.savePackageJson(pkg)
  }

  /**
   * Reads the `package.json` file from disk, parses the
   * JSON to an object returns the JavaScript object.
   *
   * @returns {Object}
   */
  async getPackageJson () {
    return JSON.parse(
      await readFile(this.packageJsonPath(), 'utf8')
    )
  }

  /**
   * Write the given `content` to the app’s `package.json` file.
   *
   * @param {String} content
   */
  async savePackageJson (content) {
    await writeFile(
      this.packageJsonPath(),
      JSON.stringify(content, null, 2)
    )
  }

  /**
   * Returns the absolute path to the
   * app’s `package.json` file.
   *
   * @returns {String}
   */
  packageJsonPath () {
    return Path.resolve(this.appPath, 'package.json')
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
   */
  async runAppSetup () {
    return Execa('node', ['craft', 'setup', `--name=${this.appName}`], {
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

module.exports = NewCommand
