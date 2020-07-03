import React from 'react'
export default class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stocks: [],
            isBuy: true,
            brokerage: 10
        };
        this.componentDidMount = this.componentDidMount.bind(this);
        this.enactTrade = this.enactTrade.bind(this);
        this.resetAll = this.resetAll.bind(this);
    }
    componentDidMount() {
        let tryStocks;
        let brokerage;
        try {
            tryStocks = JSON.parse(localStorage.getItem("stocks"));
            brokerage = JSON.parse(localStorage.getItem("brokerage"));
            this.setState({
                stocks: tryStocks,
                brokerage: brokerage
            });
        } catch (e) {
            console.log("oh no!");
        }
        window.addEventListener("beforeunload", () => {
            localStorage.setItem("stocks", JSON.stringify(this.state.stocks));
            localStorage.setItem("brokerage", JSON.stringify(this.state.brokerage));
        });
        setInterval(this.updatePrices, 1000 * 60);
    }
    updatePrices() {
        //send XHR and update prices

    }
    enactTrade() {
        this.setState(state => {
            state.stocks.push({ code: this.state.actCode, price: this.state.actPrice, amount: this.state.actAmount });
            return state;
        })
    }
    resetAll() {
        this.setState(state => {
            state.stocks = [];
            return state;
        })
    }
    render() {
        return <div>
            <h1>Stock monitor</h1>
            <label>Brokerage: <input value={this.state.brokerage} onChange={(e) => this.setState({ brokerage: e.target.value })}></input></label>
            <div style={{ display: "flex" }}>
                <div>
                    <table>
                        <tr>
                            <th>Stock code</th>
                            <th>Stock price ($)</th>
                            <th>Your holdings</th>
                            <th>Value ($)</th>
                            <th>Purchase price (inc brokerage) ($)</th>
                            <th>Net profit ($)</th>
                        </tr>
                        {
                            this.state.stocks.map(i => <tr>
                                <td>{i.code}</td>
                                <td>{i.price}</td>
                                <td>{i.amount}</td>
                                <td>{i.price * i.amount}</td>
                            </tr>)
                        }
                    </table>
                    <div>
                        <h2>Submit a trade</h2>
                        <p>
                            Buy<input type="radio" name="buysell" checked={this.state.isBuy} onChange={() => this.setState({ isBuy: true })}></input>
                            or Sell<input type="radio" name="buysell" checked={!this.state.isBuy} onChange={() => this.setState({ isBuy: false })}></input>
                        </p>
                        <p>
                            Stock code: <input placeholder="e.g. TLS" value={this.state.actCode} onChange={(e) => this.setState({ actCode: e.target.value })}></input>
                        </p>
                        <p>
                            Amount to buy: <input placeholder="e.g. 500" value={this.state.actAmount} onChange={(e) => this.setState({ actAmount: e.target.value, actValue: "" })} ></input> or
                            Value to buy: $<input placeholder="e.g. 1000" value={this.state.actValue} onChange={(e) => this.setState({ actValue: e.target.value, actAmount: "" })}></input>
                        </p>
                        <p>
                            Price to buy: <input placeholder="e.g. 1.40" value={this.state.actPrice} onChange={(e) => this.setState({ actPrice: e.target.value, actMarketPrice: false })}></input> or
                        <label> At market <input type="checkbox" checked={this.state.actMarketPrice} onChange={(e) => this.setState({ actPrice: "", actMarketPrice: e.target.checked })}></input></label>
                        </p>
                        <button onClick={this.enactTrade}>Submit</button>
                    </div>
                    <button onClick={this.resetAll}>Reset Portfolio</button>
                </div>
            </div>
        </div >
    }
}