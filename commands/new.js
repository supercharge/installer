'use strict'

const Fs = require('fs')
const Path = require('path')
const Listr = require('listr')
const Execa = require('execa')
const { promisify } = require('util')
const readDir = promisify(Fs.readdir)
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

  async handle ({ name }) {
    this.appPath = Path.resolve(process.cwd(), name)

    this.success('Crafting a new Supercharge application\n')

    const tasks = new Listr([
      {
        title: 'Ensure installation directory is empty',
        task: () => this.ensureEmptyInstallPath(name)
      },
      {
        title: 'Crafting your application',
        task: () => this.cloneApp()
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

    try {
      await this.runAppSetup(name)
    } catch (error) {
      console.error(error)
    }
  }

  async ensureEmptyInstallPath (appName) {
    if (!await this.pathExists(this.appPath)) {
      return
    }

    const files = await readDir(this.appPath)

    if (files.length > 0) {
      throw new Error(`The install directory is not empty. Cannot install ${appName} here.`)
    }
  }

  async cloneApp () {
    await Execa('git', ['clone', '--depth=1', this.blueprint, this.appPath])
    await this.removeDir(Path.resolve(this.appPath, '.git'))
  }

  async installAppDependencies () {
    return Execa('npm', ['install'], { cwd: this.appPath })
  }

  async runAppSetup (name) {
    await Execa('node', ['craft', 'setup', `--name=${name}`], {
      stdin: 'inherit',
      stdout: 'inherit',
      cwd: this.appPath
    })
  }
}

module.exports = New
