#!/usr/bin/env node
'use strict'

const Ace = require('@adonisjs/ace')
const Pkg = require('./package.json')
const UpdateNotifier = require('update-notifier')

UpdateNotifier({ pkg: Pkg }).notify({ isGlobal: true })

Ace.addCommand(require('./commands/new'))
Ace.wireUpWithCommander()
Ace.invoke()
