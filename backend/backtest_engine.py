from __future__ import annotations


def run_backtest(signal_rows: list[dict], cash: float = 100000, fee: float = 0.001) -> dict:
    if cash <= 0:
        raise ValueError("cash must be positive")
    if fee < 0:
        raise ValueError("fee cannot be negative")
    if not signal_rows:
        raise ValueError("signal_rows cannot be empty")

    initial_cash = float(cash)
    cash_balance = float(cash)
    position = 0.0
    trades: list[dict] = []
    equity_curve: list[dict] = []

    for row in signal_rows:
        close = float(row["close"])
        signal = int(row.get("signal", 0))
        date = str(row["date"])

        if signal > 0 and cash_balance > 0:
            requested = row.get("trade_amount")
            budget = min(float(requested), cash_balance) if requested is not None else cash_balance
            gross_amount = budget / (1 + fee)
            quantity = gross_amount / close
            commission = gross_amount * fee
            if quantity > 0:
                cash_balance -= gross_amount + commission
                position += quantity
                trades.append(
                    {
                        "date": date,
                        "side": "buy",
                        "price": close,
                        "quantity": quantity,
                        "amount": gross_amount,
                        "fee": commission,
                    }
                )
        elif signal < 0 and position > 0:
            gross_amount = position * close
            commission = gross_amount * fee
            cash_balance += gross_amount - commission
            trades.append(
                {
                    "date": date,
                    "side": "sell",
                    "price": close,
                    "quantity": position,
                    "amount": gross_amount,
                    "fee": commission,
                }
            )
            position = 0.0

        equity = cash_balance + position * close
        curve_row = dict(row)
        curve_row.update({"cash": cash_balance, "position": position, "equity": equity})
        equity_curve.append(curve_row)

    return {
        "initial_cash": initial_cash,
        "final_equity": equity_curve[-1]["equity"],
        "cash": cash_balance,
        "position": position,
        "trades": trades,
        "equity_curve": equity_curve,
    }


def build_buy_hold_curve(price_rows: list[dict], cash: float = 100000, fee: float = 0.001) -> list[dict]:
    if not price_rows:
        return []
    first_price = float(price_rows[0]["close"])
    gross_amount = cash / (1 + fee)
    quantity = gross_amount / first_price
    remaining_cash = cash - gross_amount - gross_amount * fee
    return [
        {"date": row["date"], "equity": remaining_cash + quantity * float(row["close"])}
        for row in price_rows
    ]
