'use strict'

const Ace = require('@adonisjs/ace')

Ace.addCommand(require('./commands/new'))
Ace.wireUpWithCommander()
Ace.invoke()
