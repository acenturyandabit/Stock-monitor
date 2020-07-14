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
            portfolios: [{
                stocks: [],
                priceData: [],
                valueData: []
            }],
            currentPortfolio: 0,
            validatedCode: "",
            validatedPrice: "",
            graphMode: "value",
            isBuy: true,
            actMarketPrice: true,
            brokerage: 10,
            priceData: [],
            valueData: [],
        };
        this.componentDidMount = this.componentDidMount.bind(this);
        this.enactTrade = this.enactTrade.bind(this);
        this.resetAll = this.resetAll.bind(this);
        this.updatePrices = this.updatePrices.bind(this);
        this.checkCode = this.checkCode.bind(this);
        this.resetAll = this.resetAll.bind(this);
        this.makeSample = this.makeSample.bind(this);
        this.makeNewPortfolio = this.makeNewPortfolio.bind(this);
        this.deletePortfolio = this.deletePortfolio.bind(this);
        this.clonePortfolio = this.clonePortfolio.bind(this);
    }
    componentDidMount() {
        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        gtag('js', new Date());

        gtag('config', 'UA-171629673-1');
        if (window.location.href.includes("acenturyandabit")) {
            window.location.href = "http://swarmcomp.usydrobotics.club:8034";
        }


        let tryStocks;
        let brokerage;
        let tryPortfolio;
        try {
            tryPortfolio = JSON.parse(localStorage.getItem("portfolios"));
            if (!tryPortfolio) {
                tryStocks = JSON.parse(localStorage.getItem("stocks")) || [];
                if (tryStocks) {
                    tryPortfolio = [{ stocks: tryStocks, priceData: [], valueData: [] }];
                } else {
                    tryPortfolio = [{ stocks: [], priceData: [], valueData: [] }];
                }
            }
            //clean out toxic entries from portfolio
            for (let p of tryPortfolio) {
                for (let s of p.stocks) {
                    let poisoned = s.priceData.map((i, ind) => [i, ind]).filter(i => i[0].y < 0).map(i => i[1]);
                    s.priceData = s.priceData.filter((i, ind) => poisoned.indexOf(ind) == -1);
                    s.valueData = s.valueData.filter((i, ind) => poisoned.indexOf(ind) == -1);
                }
            }
            this.setState({ portfolios: tryPortfolio });
        } catch (e) {
            console.log("load failed, please report");
        }
        brokerage = Number(localStorage.getItem("brokerage")) || 10;
        let currentPortfolio = Number(localStorage.getItem("currentPortfolio")) || 0;

        this.setState((state) => {
            state.brokerage = brokerage;
            if (state.portfolios[currentPortfolio]) state.currentPortfolio = currentPortfolio;
            return state;
        });
        window.addEventListener("beforeunload", () => {
            localStorage.setItem("portfolios", JSON.stringify(this.state.portfolios));
            localStorage.setItem("brokerage", this.state.brokerage);
            localStorage.setItem("currentPortfolio", this.state.currentPortfolio);
        });
        setTimeout(this.updatePrices);//wait until setstate completed
        setInterval(this.updatePrices, 1000 * 60);
    }
    async updatePrices() {
        //send XHR and update prices
        let queryObj = this.state.portfolios.reduce((p, i) => {
            p.push.apply(p, i.stocks.map(s => s.code));
            return p;
        }, []);
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
        queryObj = queryObj.reduce((p, i, ind) => { p[i] = newPrices[ind]; return p; }, {});
        this.setState((state) => {
            state.portfolios.forEach(i => {
                i.stocks.forEach(s => {
                    if (queryObj[s.code] > 0) {
                        s.price = queryObj[s.code];
                        s.priceData.push({ x: Date.now(), y: queryObj[s.code] / (s.purchasePrice / s.amount) });
                        s.valueData.push({ x: Date.now(), y: queryObj[s.code] * s.amount - s.purchasePrice });
                    }
                })
                //compile pricing data
                i.priceData = i.stocks.map(s => ({ label: s.code, data: s.priceData.map(i => ({ x: i.x, y: i.y })), fill: false, spanGaps: true, borderColor: "#ff0000" }));
                i.valueData = i.stocks.map(s => ({ label: s.code, data: s.valueData.map(i => ({ x: i.x, y: i.y })), fill: false, spanGaps: true, borderColor: "#ff00ff" }));
                i.totalsData = i.stocks.reduce((p, s) => {
                    s.valueData.forEach((i) => {
                        if (!p.data[i.x]) p.data[i.x] = { y: 0, n: 0 };
                        p.data[i.x].y += i.y;
                        p.data[i.x].n++;
                    })
                    return p;
                }, {
                    label: "Total",
                    data: {},
                    fill: false,
                    spanGaps: true,
                    borderColor: "#ff00ff"
                });
                let totalAccounted = 0;
                i.totalsData.data = Object.entries(i.totalsData.data).sort((a, b) => a[0] - b[0]).filter(i => {
                    totalAccounted = Math.max(i[1].n, totalAccounted);
                    return i[1].n == totalAccounted;
                }).map((i) => ({ x: Number(i[0]), y: i[1].y }));
                i.totalsData = [i.totalsData];
            })
            // summary is built in html
            return state;
        })
    }
    async enactTrade() {
        //input state validation
        if (!(Number(this.state.actPrice) || this.state.actMarketPrice)) {
            alert("Please set a price.");
            return;
        } else if (!(Number(this.state.actValue) || Number(this.state.actAmount))) {
            alert("Please pick a valid quantity.");
            return;
        }

        //next, validate that it is actually a stock
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
                let preExisting = state.portfolios[state.currentPortfolio].stocks.map(i => i.code).indexOf(state.actCode);
                if (!state.isBuy) {
                    if (state.portfolios[state.currentPortfolio].stocks[preExisting].amount < theVolume && !window.confirm("Warning: you are trying to sell more stock than you own - this is not allowed by most major trading firms. Proceed?")) return;
                    theVolume = -theVolume;
                }
                //if (state.actMarketPrice && state.actValue && !confirm("Warning: Most platforms won't allow you to specify a total value and choose market price"))
                if (preExisting != -1) {
                    state.portfolios[state.currentPortfolio].stocks[preExisting].price = newPrices[0];
                    state.portfolios[state.currentPortfolio].stocks[preExisting].amount = Number(state.portfolios[state.currentPortfolio].stocks[preExisting].amount) + Number(theVolume);
                    state.portfolios[state.currentPortfolio].stocks[preExisting].purchasePrice = Number(state.portfolios[state.currentPortfolio].stocks[preExisting].purchasePrice) + thePrice * theVolume + Number(state.brokerage);
                } else {
                    state.portfolios[state.currentPortfolio].stocks.push({ code: state.actCode, price: newPrices[0], amount: theVolume, purchasePrice: thePrice * theVolume + Number(state.brokerage), priceData: [], valueData: [] });
                }
                setTimeout(this.updatePrices, 100);
                return state;
            })
        } else {
            alert(`${this.state.actCode} is not a valid stock code.`)
        }
    }
    makeNewPortfolio() {
        this.setState((state) => {
            state.portfolios.push({ stocks: [], priceData: [], valueData: [] });
            state.currentPortfolio = state.portfolios.length - 1;
            return state;
        });
    }
    clonePortfolio() {
        this.setState((state) => {
            state.portfolios.push(JSON.parse(JSON.stringify(state.portfolios[state.currentPortfolio])));
            state.currentPortfolio = state.portfolios.length - 1;
            return state;
        });
    }
    deletePortfolio(p, e) {
        this.setState((state) => {
            state.portfolios.splice(p, 1);
            state.currentPortfolio = state.portfolios.length - 1;
            return state;
        });
        e.stopPropagation();
    }
    async makeSample() {
        await this.makeNewPortfolio();
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
            state.portfolios[state.currentPortfolio].stocks = newCodes.map((i, ind) => ({
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
    resetAll() {
        if (window.confirm("Wipe all data? This operation cannot be reversed!")) this.setState(state => {
            state.portfolios[state.currentPortfolio].stocks = [];
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
            <div className="tabbars">{
                this.state.portfolios.map((i, ind) => <span key={ind} style={ind == this.state.currentPortfolio ? { background: "purple", color: "white" } : {}} onClick={() => this.setState({ currentPortfolio: ind })}>Portfolio {ind + 1}
                    {this.state.portfolios.length > 1 ? <span onClick={(e) => this.deletePortfolio(ind, e)}>&times;</span> : ""}
                </span>)
            }<span onClick={this.makeNewPortfolio}>New portfolio...</span></div>
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
                                this.state.portfolios[this.state.currentPortfolio].stocks.map(i => <tr key={i.code}>
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
                                <th> {dollarRound(this.state.portfolios[this.state.currentPortfolio].stocks.reduce((p, i) => p + i.price * i.amount, 0))}</th>
                                <th> {dollarRound(this.state.portfolios[this.state.currentPortfolio].stocks.reduce((p, i) => p + i.purchasePrice, 0))}</th>
                                <th> {dollarRound(this.state.portfolios[this.state.currentPortfolio].stocks.reduce((p, i) => p + i.price * i.amount - i.purchasePrice, 0))}</th>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <div>
                        <h3>{this.state.graphMode ? "Price (percent change)" : "Value"}</h3>
                        <Chart style={{ height: "40vh" }} type="line" data={
                            {
                                datasets: JSON.parse(JSON.stringify(this.state.portfolios[this.state.currentPortfolio][this.state.graphMode + "Data"]))
                            }}
                            options={{
                                scales: {
                                    yAxes: [{
                                        ticks: {
                                            beginAtZero: false
                                        }
                                    }],
                                    xAxes: [{ type: 'time' }]
                                }
                            }}
                        ></Chart>
                    </div>
                    <p>Show:
                     Price data <input type="radio" name="graphPV" checked={this.state.graphMode == "price"} onChange={() => this.setState({ graphMode: "price" })}></input>
                     or Value data <input type="radio" name="graphPV" checked={this.state.graphMode == "value"} onChange={() => this.setState({ graphMode: "value" })}></input>
                     or Totals <input type="radio" name="graphPV" checked={this.state.graphMode == "totals"} onChange={() => this.setState({ graphMode: "totals" })}></input>
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
                <button onClick={this.clonePortfolio}>Clone Portfolio</button>
            </div>
        </div >
    }
}