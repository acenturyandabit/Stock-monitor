import React from 'react'
import indexStyles from '../styles/index.css'

import Chart from 'react-chartjs-2'

function dollarRound(v) {
    return Math.round(v * 100) / 100;
}

export default class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stocks: [],
            isBuy: true,
            brokerage: 10,
            validatedCode: "",
            validatedPrice: "",
            priceData: [],
            valueData: []
        };
        this.componentDidMount = this.componentDidMount.bind(this);
        this.enactTrade = this.enactTrade.bind(this);
        this.resetAll = this.resetAll.bind(this);
        this.updatePrices = this.updatePrices.bind(this);
        this.checkCode = this.checkCode.bind(this);
        this.resetAll = this.resetAll.bind(this);
        this.makeSample = this.makeSample.bind(this);
    }
    componentDidMount() {
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
      
        gtag('config', 'UA-171629673-1');


        let tryStocks;
        let brokerage;
        try {
            tryStocks = JSON.parse(localStorage.getItem("stocks")) || [];
            brokerage = JSON.parse(localStorage.getItem("brokerage")) || 10;
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
        this.updatePrices();
        setInterval(this.updatePrices, 1000 * 60);
    }
    async updatePrices() {
        //send XHR and update prices
        let queryObj = this.state.stocks.map(i => i.code);
        let newPrices = await new Promise((res) => {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", "http://swarmcomp.usydrobotics.club:8034/getPrices?codes=" + queryObj.join(","));
            xhr.onreadystatechange = function () { // Call a function when the state changes.
                if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                    res(JSON.parse(xhr.responseText));
                }
            }
            xhr.send();
        });
        this.setState((state) => {
            let stockmap = state.stocks.map(i => i.code);
            queryObj.map((i, ind) => {
                let stateindex = stockmap.indexOf(i);
                state.stocks[stateindex].price = newPrices[ind];
                state.stocks[stateindex].priceData.push({ x: Date.now(), y: newPrices[ind] / (state.stocks[stateindex].purchasePrice / state.stocks[stateindex].amount) });
                state.stocks[stateindex].valueData.push({ x: Date.now(), y: newPrices[ind] * state.stocks[stateindex].amount - state.stocks[stateindex].purchasePrice });
            });
            //compile pricing data
            state.priceData = state.stocks.map(i => ({ label: i.code, data: i.priceData.map(i => ({ x: i.x, y: i.y })), fill: false, spanGaps: true, borderColor: "#ff0000" }));
            state.valueData = state.stocks.map(i => ({ label: i.code, data: i.valueData.map(i => ({ x: i.x, y: i.y })), fill: false, spanGaps: true, borderColor: "#ff00ff" }));
            //state.netValueData=state.stocks.map(i=>({label:i.code,data:i.netValueData}));
            // add summary
            return state;
        })
    }
    async enactTrade() {
        //first, validate that it is actually a stock
        let newPrices = await new Promise((res) => {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", "http://swarmcomp.usydrobotics.club:8034/getPrices?codes=" + this.state.actCode);
            xhr.onreadystatechange = function () { // Call a function when the state changes.
                if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                    res(JSON.parse(xhr.responseText));
                }
            }
            xhr.send();
        });
        if (newPrices[0] > 0) {
            //further validation, if:
            //buying below market
            //selling above market
            //shorting
            //once validated, process user options
            this.setState(state => {
                let thePrice = state.actMarketPrice ? newPrices[0] : state.actPrice;
                if (thePrice > newPrices[0] && !state.isBuy && !window.confirm("Warning: you are trying to sell this stock for more than market price. This is highly unlikely to go through in a real stock exchange; proceed anyway?")) return;
                if (thePrice < newPrices[0] && state.isBuy && !window.confirm("Warning: you are trying to buy this stock for less than market price. This is highly unlikely to go through in a real stock exchange; proceed anyway?")) return;
                let theVolume = state.actAmount || Math.floor(state.actValue / thePrice);
                //if (state.actMarketPrice && state.actValue && !confirm("Warning: Most platforms won't allow you to specify a total value and choose market price"))
                //eh most beginners will probably do this, we'll put it in a footnote
                let preExisting = state.stocks.map(i => i.code).indexOf(state.actCode);
                if (!state.isBuy) {
                    if (state.stocks[preExisting].amount < theVolume && !window.confirm("Warning: you are trying to sell more stock than you own - this is not allowed by most major trading firms. Proceed?")) return;
                    theVolume = -theVolume;
                }
                //if (state.actMarketPrice && state.actValue && !confirm("Warning: Most platforms won't allow you to specify a total value and choose market price"))
                if (preExisting != -1) {
                    state.stocks[preExisting].price = newPrices[0];
                    state.stocks[preExisting].amount = Number(state.stocks[preExisting].amount) + Number(theVolume);
                    state.stocks[preExisting].purchasePrice = Number(state.stocks[preExisting].purchasePrice) + thePrice * theVolume + Number(state.brokerage);
                } else {
                    state.stocks.push({ code: state.actCode, price: newPrices[0], amount: theVolume, purchasePrice: thePrice * theVolume + Number(state.brokerage), priceData: [], valueData: [] });
                }
                setTimeout(this.updatePrices, 100);
                return state;
            })
        } else {
            alert(`${this.state.actCode} is not a valid stock code.`)
        }
    }
    async makeSample() {
        if (window.confirm("Wipe all data? This operation cannot be reversed!")) {
            let newCodes = ["TLS", "ASX", "ALL", "KMD", "BTH"];
            let newPrices = await new Promise((res) => {
                let xhr = new XMLHttpRequest();
                xhr.open("GET", "http://swarmcomp.usydrobotics.club:8034/getPrices?codes=" + newCodes.join(","));
                xhr.onreadystatechange = function () { // Call a function when the state changes.
                    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                        res(JSON.parse(xhr.responseText));
                    }
                }
                xhr.send();
            });
            this.setState(state => {
                state.stocks = newCodes.map((i, ind) => ({
                    code: i,
                    price: newPrices[ind],
                    amount: 100,
                    purchasePrice: newPrices[ind] * 100 - Math.random() * 100,
                    priceData: [],
                    valueData: []
                }));
                state.priceData = [];
                state.valueData = [];
                setTimeout(this.updatePrices, 100);
                return state;
            })
        }
    }
    resetAll() {
        if (window.confirm("Wipe all data? This operation cannot be reversed!")) this.setState(state => {
            state.stocks = [];
            state.priceData = [];
            state.valueData = [];
            return state;
        })
    }
    async checkCode() {
        let newPrices = await new Promise((res) => {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", "http://swarmcomp.usydrobotics.club:8034/getPrices?codes=" + this.state.actCode);
            xhr.onreadystatechange = function () { // Call a function when the state changes.
                if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                    res(JSON.parse(xhr.responseText));
                }
            }
            xhr.send();
        });
        if (newPrices[0] > 0) {
            this.setState({ validatedCode: this.state.actCode, validatedPrice: newPrices[0] });
        } else {
            this.setState({ validatedCode: this.state.actCode, validatedPrice: "INVALID" });
        }
    }
    render() {
        return <div className={indexStyles.container}>

            <script async src="https://www.googletagmanager.com/gtag/js?id=UA-171629673-1"></script>
            <h1>Stock monitor</h1>
            <p>by acenturyandabit <a href="https://github.com/acenturyandabit/stock-monitor">Learn more</a></p>
            <label>Brokerage: <input value={this.state.brokerage} onChange={(e) => this.setState({ brokerage: e.target.value })}></input></label>
            <div style={{ display: "flex" }} className={"mainContainer"}>
                <div>
                    <table>
                        <tbody>
                            <tr>
                                <th>Stock code</th>
                                <th>Stock price ($)</th>
                                <th>Your holdings</th>
                                <th>Value ($)</th>
                                <th>Purchase price (inc brokerage) ($)</th>
                                <th>Net profit ($)</th>
                            </tr>
                            {
                                this.state.stocks.map(i => <tr key={i.code}>
                                    <td>{i.code}</td>
                                    <td>{i.price}</td>
                                    <td>{i.amount}</td>
                                    <td>{dollarRound(i.price * i.amount)}</td>
                                    <td>{dollarRound(i.purchasePrice)}</td>
                                    <td>{dollarRound(i.price * i.amount - i.purchasePrice)}</td>
                                </tr>)
                            }
                            <tr>
                                <th>Total</th>
                                <th> </th>
                                <th> </th>
                                <th> {dollarRound(this.state.stocks.reduce((p, i) => p + i.price * i.amount, 0))}</th>
                                <th> {dollarRound(this.state.stocks.reduce((p, i) => p + i.purchasePrice, 0))}</th>
                                <th> {dollarRound(this.state.stocks.reduce((p, i) => p + i.price * i.amount - i.purchasePrice, 0))}</th>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <div>
                        <Chart style={{ height: "40vh" }} type="line" data={
                            {
                                labels: [this.state.graphPrice ? "Price (percent change)" : "Value"],
                                datasets: this.state.graphPrice ? JSON.parse(JSON.stringify(this.state.priceData)) : JSON.parse(JSON.stringify(this.state.valueData)),
                                scales: {
                                    yAxes: [{
                                        ticks: {
                                            beginAtZero: false
                                        }
                                    }],
                                    xAxes: [{ type: 'linear' }]
                                }
                            }
                        }></Chart>
                    </div>
                    <p>Show:
                     Price data <input type="radio" name="graphPV" checked={this.state.graphPrice} onChange={() => this.setState({ graphPrice: true })}></input>
                     or Value data <input type="radio" name="graphPV" checked={!this.state.graphPrice} onChange={() => this.setState({ graphPrice: false })}></input>
                    </p>
                </div>
            </div>
            <div>
                <div>
                    <h2>Submit a trade</h2>
                    <p>
                        Buy<input type="radio" name="buysell" checked={this.state.isBuy} onChange={() => this.setState({ isBuy: true })}></input>
                            or Sell<input type="radio" name="buysell" checked={!this.state.isBuy} onChange={() => this.setState({ isBuy: false })}></input>
                    </p>
                    <p>
                        Stock code: <input placeholder="e.g. TLS" value={this.state.actCode} onChange={(e) => this.setState({ actCode: e.target.value, validatedCode: "" })}></input>
                    </p>
                    <button onClick={this.checkCode}>Check now</button>{/*<button onClick={this.setState({viewStocks:true})}>View Stock List</button>*/}
                    <div style={{ display: (this.state.validatedCode != "") ? "block" : "none", border: "1px solid black" }}>
                        <h3>{this.state.validatedCode}</h3>
                        <p>Price: {this.state.validatedPrice}</p>
                    </div>
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
                <button onClick={this.makeSample}>Sample Portfolio</button>
                <button onClick={this.updatePrices}>Update Now</button>
            </div>
        </div >
    }
}