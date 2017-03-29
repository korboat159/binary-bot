import React from 'react'
import ReactDOM from 'react-dom'
import { BinaryChart } from 'binary-charts'
import { logoutAllTokens } from 'binary-common-utils/lib/account'
import { observer as globalObserver } from 'binary-common-utils/lib/observer'
import {
  getTokenList, removeAllTokens,
  get as getStorage, set as setStorage, getToken,
} from 'binary-common-utils/lib/storageManager'
import { LiveApi } from 'binary-live-api'
import TradeInfo from './tradeInfo'
import _Blockly from './blockly'
import { translate } from '../../common/i18n'
import { SaveXml } from './react-components/SaveXml'
import { LimitsPanel } from './react-components/LimitsPanel'
import { getLanguage } from '../../common/lang'
import { symbolPromise, ticksService } from './shared'
import { logHandler } from './logger'
import { Tour } from './tour'

let realityCheckTimeout

let chartData = []
let symbol = 'R_100'
let chartType = 'line'
const pipSize = 2
let dataType = 'ticks'
let granularity = 60
let contractForChart = null
let chartComponent
let listeners = {}

const api = new LiveApi({
  language: getStorage('lang') || 'en',
  appId: getStorage('appId') || 1,
})

api.events.on('balance', response => {
  const { balance: { balance, currency } } = response

  $('.topMenuBalance').text(`${balance} ${currency}`)
})

const addBalanceForToken = token => {
  api.authorize(token).then(() => {
    api.send({ forget_all: 'balance' }).then(() => {
      api.subscribeToBalance()
    })
  })
}

const stopTickListeners = () => {
  if (listeners.ohlc) {
    ticksService.stopMonitor({
      symbol,
      granularity,
      key: listeners.ohlc,
    })
  }
  if (listeners.tick) {
    ticksService.stopMonitor({
      symbol,
      key: listeners.tick,
    })
  }
  listeners = {}
}

const updateChart = () => {
  if (!$('#summaryPanel:visible').length) {
    return
  }

  const isMinHeight = $(window).height() <= 360

  if (chartComponent && dataType === 'ticks' && contractForChart) {
    const { chart } = chartComponent
    const { dataMax } = chart.xAxis[0].getExtremes()
    const { minRange } = chart.xAxis[0].options

    chart.xAxis[0].setExtremes(dataMax - minRange, dataMax)
  }

  chartComponent = ReactDOM.render(
    <BinaryChart
    className="trade-chart"
    id="trade-chart0"
    contract={dataType === 'ticks' ? contractForChart : false}
    pipSize={pipSize}
    shiftMode="dynamic"
    ticks={chartData}
    getData={getData} // eslint-disable-line no-use-before-define
    type={chartType}
    hideToolbar={isMinHeight}
    hideTimeFrame={isMinHeight}
    onTypeChange={(type) => (chartType = type)}
    />, $('#chart')[0])
}

const updateTickListeners = () => new Promise(resolve => {
  const callback = response => {
    chartData = response
    resolve()
    updateChart()
  }

  if (dataType === 'candles') {
    listeners.ohlc = ticksService.monitor({ symbol, granularity, callback })
  } else {
    listeners.tick = ticksService.monitor({ symbol, callback })
  }
})

const getData = (start, end, newDataType, newGranularity) => {
  stopTickListeners()
  dataType = newDataType
  granularity = newGranularity
  return updateTickListeners()
}

const showRealityCheck = () => {
  $('.blocker').show()
  $('.reality-check').show()
}

const hideRealityCheck = () => {
  $('#rc-err').hide()
  $('.blocker').hide()
  $('.reality-check').hide()
}

const stopRealityCheck = () => {
  clearInterval(realityCheckTimeout)
  realityCheckTimeout = null
}

const realityCheckInterval = () => {
  realityCheckTimeout = setInterval(() => {
    const now = parseInt((new Date().getTime()) / 1000, 10)
    const checkTime = +getStorage('realityCheckTime')
    if (checkTime && now >= checkTime) {
      showRealityCheck()
      stopRealityCheck()
    }
  }, 1000)
}

const startRealityCheck = (time, token) => {
  stopRealityCheck()
  if (time) {
    const start = parseInt((new Date().getTime()) / 1000, 10) + (time * 60)
    setStorage('realityCheckTime', start)
    realityCheckInterval()
  } else {
    const tokenObj = getToken(token)
    if (tokenObj.hasRealityCheck) {
      const checkTime = +getStorage('realityCheckTime')
      if (!checkTime) {
        showRealityCheck()
      } else {
        realityCheckInterval()
      }
    }
  }
}

const clearRealityCheck = () => {
  setStorage('realityCheckTime', null)
  stopRealityCheck()
}

const resetRealityCheck = (token) => {
  clearRealityCheck()
  startRealityCheck(null, token)
}

export default class View {
  constructor() {
    chartType = 'line'
    logHandler()
    this.tradeInfo = new TradeInfo()
    updateTickListeners()
    this.initPromise = new Promise(resolve => {
      symbolPromise.then(() => {
        this.updateTokenList()
        this.blockly = new _Blockly()
        this.blockly.initPromise.then(() => {
          this.setElementActions()
          $('#accountLis')
          startRealityCheck(null, $('.account-id').first().attr('value'))
          ReactDOM.render(<Tour />, $('#tour')[0])
          resolve()
        })
      })
    })
  }
  updateTokenList() {
    const tokenList = getTokenList()
    const loginButton = $('#login')
    const accountList = $('#account-list')
    if (tokenList.length === 0) {
      loginButton.show()
      accountList.hide()
      $('.account-id').removeAttr('value').text('')
      $('.account-type').text('')
      $('.login-id-list').children().remove()
    } else {
      loginButton.hide()
      accountList.show()

      addBalanceForToken(tokenList[0].token)

      tokenList.forEach(tokenInfo => {
        let prefix = ''
        if ('isVirtual' in tokenInfo) {
          prefix = (tokenInfo.isVirtual) ? 'Virtual Account' : 'Real Account'
        }
        if (tokenList.indexOf(tokenInfo) === 0) {
          $('.account-id').attr('value', `${tokenInfo.token}`)
            .text(`${tokenInfo.account_name}`)
          $('.account-type').text(`${prefix}`)
        } else {
          $('.login-id-list').append(`<a href="#" value="${tokenInfo.token}"><li><span>${prefix}</span><div>${tokenInfo.account_name}</div></li></a>` +
            '<div class="separator-line-thin-gray"></div>')
        }
      })
    }
  }
  setFileBrowser() {
    const readFile = (f, dropEvent = {}) => {
      const reader = new FileReader()
      reader.onload = e => this.blockly.load(e.target.result, dropEvent)
      reader.readAsText(f)
    }

    const handleFileSelect = (e) => {
      let files
      let dropEvent
      if (e.type === 'drop') {
        e.stopPropagation()
        e.preventDefault()
        files = e.dataTransfer.files
        dropEvent = e
      } else {
        files = e.target.files
      }
      files = Array.from(files)
      files.forEach(file => {
        if (file.type.match('text/xml')) {
          readFile(file, dropEvent)
        } else {
          globalObserver.emit('ui.log.info', `${
          translate('File is not supported:')} ${file.name}`)
        }
      })
    }

    const handleDragOver = (e) => {
      e.stopPropagation()
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy' // eslint-disable-line no-param-reassign
    }

    const dropZone = document.body

    dropZone.addEventListener('dragover', handleDragOver, false)
    dropZone.addEventListener('drop', handleFileSelect, false)

    $('#files').on('change', handleFileSelect)

    $('#open_btn')
      .on('click', () => {
        $.FileDialog({ // eslint-disable-line new-cap
          accept: '.xml',
          cancelButton: 'Close',
          dragMessage: 'Drop files here',
          dropheight: 400,
          errorMessage: 'An error occured while loading file',
          multiple: false,
          okButton: 'OK',
          readAs: 'DataURL',
          removeMessage: 'Remove&nbsp;file',
          title: 'Load file',
        })
      })
      .on('files.bs.filedialog', (ev) => {
        handleFileSelect(ev.files)
      })
      .on('cancel.bs.filedialog', (ev) => {
        handleFileSelect(ev)
      })
  }
  setElementActions() {
    this.setFileBrowser()
    this.addBindings()
    this.addEventHandlers()
  }
  addBindings() {
    const stop = (e) => {
      if (e) {
        e.preventDefault()
      }
      stopRealityCheck()
      this.stop()
    }

    const logout = () => {
      logoutAllTokens().then(() => {
        this.updateTokenList()
        globalObserver.emit('ui.log.info', translate('Logged you out!'))
        clearRealityCheck()
      })
    }

    $('.panelExitButton')
      .click(function onClick() {
        $(this)
          .parent()
          .hide()
      })

    $('.panel')
      .hide()
      .drags()

    $('.panel .content')
      .mousedown(e => e.stopPropagation()) // prevent content to trigger draggable

    ReactDOM.render(
      <SaveXml
        onSave={(filename, collection) => this.blockly.save(filename, collection)}
      />
      , $('#saveXml')[0])

    $('#undo')
      .click(() => {
        this.blockly.undo()
      })

    $('#redo')
      .click(() => {
        this.blockly.redo()
      })

    $('#zoomIn')
      .click(() => {
        this.blockly.zoomOnPlusMinus(true)
      })

    $('#zoomOut')
      .click(() => {
        this.blockly.zoomOnPlusMinus(false)
      })

    $('#rearrange')
      .click(() => {
        this.blockly.cleanUp()
      })

    $('#showSummary')
      .click(() => $('#summaryPanel').show())

    $('#loadXml')
      .click(() => {
        $('#files')
          .click()
      })

    $('#logout, #logout-reality-check')
      .click(() => {
        logout()
        hideRealityCheck()
      })

    $('#continue-trading')
      .click(() => {
        const time = parseInt($('#realityDuration').val(), 10)
        if (time >= 10 && time <= 120) {
          hideRealityCheck()
          startRealityCheck(time)
        } else {
          $('#rc-err').show()
        }
      })

    const startBot = (limitations) => {
      $('#stopButton').show()
      $('#runButton').hide()
      this.blockly.run(limitations)
    }

    $('#runButton')
      .click(() => {
        const token = $('.account-id').first().attr('value')
        const tokenObj = getToken(token)
        if (tokenObj && tokenObj.hasTradeLimitation) {
          ReactDOM.render(
            <LimitsPanel
            onSave={startBot}
            />
            , $('#limits-panel')[0])
        } else {
          startBot()
        }
      })

    $('#stopButton')
      .click(e => stop(e))
      .hide()

    $('#resetButton')
      .click(() => {
        this.blockly.resetWorkspace()
      })

    $('.login-id-list')
      .on('click', 'a', (e) => {
        resetRealityCheck($(e.currentTarget).attr('value'))
        e.preventDefault()
        const $el = $(e.currentTarget)
        const $oldType = $el.find('li span')
        const $oldTypeText = $oldType.text()
        const $oldID = $el.find('li div')
        const $oldIDText = $oldID.text()
        const $oldValue = $el.attr('value')
        const $newType = $('.account-type')
        const $newTypeText = $newType.first().text()
        const $newID = $('.account-id')
        const $newIDText = $newID.first().text()
        const $newValue = $newID.attr('value')
        $oldType.html($newTypeText)
        $oldID.html($newIDText)
        $el.attr('value', $newValue)
        $newType.html($oldTypeText)
        $newID.html($oldIDText)
        $newID.attr('value', $oldValue)
        $('.topMenuBalance').text('\u2002')
        addBalanceForToken($('#main-account .account-id').attr('value'))
      })

    $('#login')
      .bind('click.login', () => {
        document.location = 'https://oauth.binary.com/oauth2/authorize?app_id=' +
          `${getStorage('appId')}&l=${getLanguage().toUpperCase()}`
      })
      .text('Log in')

    $('#statement-reality-check').click(() => {
      document.location =
        `https://www.binary.com/${getLanguage()}/user/statementws.html#no-reality-check`
    })
    $(document).keydown((e) => {
      if (e.which === 189) { // -
        if (e.ctrlKey) {
          this.blockly.zoomOnPlusMinus(false)
          e.preventDefault()
        }
      } else if (e.which === 187) { // +
        if (e.ctrlKey) {
          this.blockly.zoomOnPlusMinus(true)
          e.preventDefault()
        }
      } else if (e.which === 27) { // Esc
        const exitButton = $('.panel:hover .panelExitButton')
        if (exitButton.length === 1) {
          exitButton.click()
          e.preventDefault()
        }
      }
    })
  }
  stop() {
    this.blockly.stop()
  }
  addEventHandlers() {
    globalObserver.register('Error', error => {
      if (error.error && error.error.code === 'InvalidToken') {
        removeAllTokens()
        this.updateTokenList()
        this.stop()
      }
    })

    globalObserver.register('bot.start', s => {
      if (symbol !== s) {
        stopTickListeners()
        symbol = s
        getData(undefined, undefined, dataType, granularity)
      }
    })

    globalObserver.register('bot.info', info => {
      this.tradeInfo.addInfo(info)
      if ('profit' in info) {
        const token = $('.account-id').first().attr('value')
        const user = getToken(token)
        globalObserver.emit('log.revenue', {
          user,
          profit: info.profit,
        })
      }
    })

    globalObserver.register('bot.contract', contract => {
      if (contract) {
        this.tradeInfo.addContract(contract)
        if (contract.is_sold) {
          contractForChart = null
        } else {
          contractForChart = contract
        }
      }
    })
  }
}
