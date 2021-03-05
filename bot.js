const ccxt = require('ccxt')
require('dotenv').config()

class dcaBot {
	start () {
		this.kucoin = (() => {
			const kucoin = new ccxt.kucoin({
				// proxy: 'https://cors-anywhere.herokuapp.com/',
				// proxy: process.env.proxy,
				apiKey: process.env.apiKey,
				secret: process.env.secret,
				password: process.env.password
			})

			// if (process.env.sandBoxAPI && kucoin.urls.test) {
			// 	kucoin.urls.api = kucoin.urls.test
			// }

			return kucoin
		})()

		this.spentAmount = parseFloat(process.env.spentAmount)
		this.stopped = false
		this.buying = true

		this.buyLoop()
		this.sellLoop()
	}

	async lastPrice () {
		const orders = await this.kucoin.fetchTicker(process.env.pairSymbol)

		return orders.last
	}

	async quoteHoldings () {
		const wallet = await this.kucoin.fetchBalance()
		this.holdingsAmount = wallet[process.env.pairBase].free
		return this.holdingsAmount
	}

	async quoteHoldingsValue() {
		const price = await this.lastPrice()
		this.holdingsValue = await this.quoteHoldings() * price

		return this.holdingsValue
	}

	async profitTargetMet () {
		const value = await this.quoteHoldingsValue()
		const decimalPercent = process.env.profitTakePercent / 100

		console.log({
			value: parseFloat(value.toFixed(3)),
			entryPrice: parseFloat((this.spentAmount / this.holdingsAmount).toFixed(3)),
			target: parseFloat(((decimalPercent * this.spentAmount) + this.spentAmount).toFixed(3)),
			profitPrice: parseFloat((((decimalPercent * this.spentAmount) + this.spentAmount) / this.holdingsAmount).toFixed(3))
		})

		return this.spentAmount > 0 && (value >= (decimalPercent * this.spentAmount) + this.spentAmount)
	}

	async sellLoop() {
		if (await this.profitTargetMet() && ! this.buying) {
			// console.log(this.holdingsAmount)
			await this.kucoin.createOrder(process.env.pairSymbol, 'market', 'sell', parseFloat(this.holdingsAmount))
			this.stopped = true
			console.log('SOLD!')
		} else {
			setTimeout(async () => {
				await this.sellLoop()
			}, process.env.sellRateSeconds * 1000)
		}
	}

	async buyLoop() {
		this.buying = true

		// We aren't stopped and our value is lower than what we've spent.
		if(! this.stopped && (this.holdingsValue <= this.spentAmount || this.spentAmount === 0)) {
			// If we haven't capped spending
			if(this.spentAmount < process.env.investMax) {
				await this.kucoin.createOrder(process.env.pairSymbol, 'market', 'buy', parseFloat(process.env.buyAmountQuote), undefined, { quoteAmount: true })
				this.spentAmount += parseFloat(process.env.buyAmountQuote)
				console.log(`Spent ${this.spentAmount.toFixed(3)}`)
			}
		}

		this.buying = false

		setTimeout(async () => {
			await this.buyLoop()
		}, process.env.buyRateSeconds * 1000)
	}
}

module.exports.default = dcaBot

new dcaBot().start()