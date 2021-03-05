# dcabot
Dollar cost averaging bot

# usage
```npm install```
copy .env.example to .env
Enter your api connection information.
Enter your trading symbol, purchase amount, stop and speeds.

```npm run dca```

# notes
This bot will spend the quote currency in the trading account to obtain the base currency. When the profit threshhold is met it will sell ALL of the base currency held.