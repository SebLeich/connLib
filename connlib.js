class connlibAbstractRenderable {

    guid;

    constructor() {

    }

    get domId() {
        return this.guid;
    }
    /**
     * the method returns whether the current instance is currently rendered
     */
    isRendered() {
        if (document.getElementById(this.domId)) {
            return true;
        }
        return false;
    }
    /**
     * the method enables user's to delete an element from the dom
     */
    remove() {
        let elem = document.getElementById(this.domId);
        elem.parentNode.removeChild(elem);
    }
}

class connlibRenderable extends connlibAbstractRenderable {

    canvas;

    constructor() {
        super();
    }
}

class connlib {

    // connlib-block - default elements, whose should not be overlapping with edges (margin = 1 * grid size)
    // connlib-block-a-top, connlib-block-a-right, connlib-block-a-bottom, connlib-block-a-left
    // connlib-element - all elements within the connlib domain

    static _instance = null;

    _containerId = null;

    _connections = [];
    _endpoints = [];
    _canvas = [];
    _gridScale = 1;
    _renderGrid = false;
    _internalGrid;

    _moveX = 300;
    _moveY = 60;
    _moveStep = 20;
    _invertMoveDirection = false;
    _gridPadding = 80;

    _renderCellsWalkable = false;
    _renderCellsNotWalkable = true;
    _gridCellsRendered = false;

    // how far should the endpoints stand
    static _endpointStag = 40;

    constructor() {

    }

    /**
     * the method applys the transform to all contents
     */
    static applyTransform() {
        let elements = document.getElementsByClassName("connlib-element");
        for (let element of elements) {
            element.style.transform = "translate(" + this._instance._moveX + "px, " + this._instance._moveY + "px)";
        }
        document.getElementById("background-grid").style.transform = "translate(" + this._instance._moveX + "px, " + this._instance._moveY + "px)";
    }
    /**
     * the method clears the background svg
     */
    clear() {
        document.getElementById("background-grid").innerHTML = "";
    }
    /**
     * the method enables user's to connect 2 dom elements and returns whether a connection can be established
     * @param {*} source dom identifier 
     * @param {*} target dom identifier
     */
    static connect(source, target) {
        if (!this.isReady()) {
            return false;
        }
        if (typeof (source) == "string" && typeof (target) == "string") {
            var cancel = false;
            let el1 = document.getElementById(source);
            if (!el1) {
                console.log("cannot find source node on DOM");
                cancel = true;
            }
            let el2 = document.getElementById(target);
            if (!el2) {
                console.log("cannot find target node on DOM");
                cancel = true;
            }
            if (cancel) return false;
            let conn = new connlibConnection(null, null);
            conn.connect(el1, el2);
        } else {
            console.log("connlib is currently only supporting to connect elements by there identifier");
            return false;
        }
    }

    get containerId() {
        return this._containerId;
    }

    set containerId(value) {
        this._containerId = value;
    }

    static createInstance() {
        if (connlib._instance == null) connlib._instance = new connlib();
        return connlib._instance;
    }

    static init(containerId) {
        let instance = this.createInstance();
        instance.containerId = containerId;
        window.addEventListener("resize", () => {
            let w = window.innerWidth;
            let h = window.innerHeight;
            let bg = document.getElementById("background-grid");
            if ((bg.width != w) || (bg.height != h)) this._instance.updateGrid();
        });
        window.addEventListener("keyup", (event) => {
            switch (event.keyCode) {
                case 37:
                    if (this._instance._invertMoveDirection) this.instance._moveX -= this.instance._moveStep;
                    this.instance._moveX += this.instance._moveStep;
                    break;
                case 38:
                    if (this._instance._invertMoveDirection) this.instance._moveY -= this.instance._moveStep;
                    this.instance._moveY += this.instance._moveStep;
                    break;
                case 39:
                    if (this._instance._invertMoveDirection) this.instance._moveX += this.instance._moveStep;
                    this.instance._moveX -= this.instance._moveStep;
                    break;
                case 40:
                    if (this._instance._invertMoveDirection) this.instance._moveY += this.instance._moveStep;
                    this.instance._moveY -= this.instance._moveStep;
                    break;
            }
            this.applyTransform();
        });
        return instance;
    }

    static get instance() {
        return this._instance;
    }

    static isReady() {
        if (!this._instance) {
            console.log("no instance created");
            return false;
        }
        if (!this.instance._containerId) {
            console.log("no parent container setted");
            return false;
        }
        return true;
    }

    static point(point, color) {
        let bg = document.getElementById("background-grid");
        let p = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        p.setAttribute("cx", point.c);
        p.setAttribute("cy", point.r);
        p.setAttribute("r", 1);
        p.setAttribute("fill", color);
        bg.appendChild(p);
    }

    render() {
        this.updateGrid();
        connlib.applyTransform();
        let bg = document.getElementById("background-grid");
        for (let e of connlib._instance._endpoints) {
            let corrL = e.left - parseFloat(bg.style.left);
            let corrT = e.top - parseFloat(bg.style.top);
            switch (e.type) {
                case connlibEndpointType.DEFAULT:
                    let c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    c.setAttribute("cx", corrL);
                    c.setAttribute("cy", corrT);
                    c.setAttribute("r", 5);
                    c.setAttribute("fill", "black");
                    let d = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    d.style.stroke = "#373737";
                    d.style.strokeWidth = 1;
                    switch (e.direction) {
                        case connlibEdgeDirection.TOP:
                            d.setAttribute("d", "M" + corrL + " " + corrT + " L" + corrL + " " + (corrT - connlib._endpointStag));
                            break;
                        case connlibEdgeDirection.RIGHT:
                            d.setAttribute("d", "M" + corrL + " " + corrT + " L" + (corrL + connlib._endpointStag) + " " + corrT);
                            break;
                        case connlibEdgeDirection.BOTTOM:
                            d.setAttribute("d", "M" + corrL + " " + corrT + " L" + corrL + " " + (corrT + connlib._endpointStag));
                            break;
                        case connlibEdgeDirection.LEFT:
                            d.setAttribute("d", "M" + corrL + " " + corrT + " L" + (corrL - connlib._endpointStag) + " " + corrT);
                            break;
                    }
                    bg.appendChild(c);
                    bg.appendChild(d);
                    break;
                case connlibEndpointType.ARROW:
                    let a = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    a.style.fill = "#373737";
                    a.style.strokeWidth = 1;
                    let b = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    b.style.stroke = "#373737";
                    b.style.strokeWidth = 1;
                    switch (e.direction) {
                        case connlibEdgeDirection.TOP:
                            a.setAttribute("points", corrL + "," + corrT + " " + (corrL - 10) + "," + (corrT - 20) + " " + (corrL + 10) + "," + (corrT - 20));
                            b.setAttribute("d", "M" + corrL + " " + (corrT - 20) + " L" + corrL + " " + (corrT - connlib._endpointStag));
                            break;
                        case connlibEdgeDirection.RIGHT:
                            a.setAttribute("points", corrL + "," + corrT + " " + (corrL + 20) + "," + (corrT + 10) + " " + (corrL + 20) + "," + (corrT - 10));
                            b.setAttribute("d", "M" + (corrL + 20) + " " + corrT + " L" + (corrL + connlib._endpointStag) + " " + corrT);
                            break;
                        case connlibEdgeDirection.BOTTOM:
                            a.setAttribute("points", corrL + "," + corrT + " " + (corrL + 10) + "," + (corrT + 20) + " " + (corrL - 10) + "," + (corrT + 20));
                            b.setAttribute("d", "M" + corrL + " " + (corrT + 20) + " L" + corrL + " " + (corrT + connlib._endpointStag));
                            break;
                        case connlibEdgeDirection.LEFT:
                            a.setAttribute("points", corrL + "," + corrT + " " + (corrL - 20) + "," + (corrT + 10) + " " + (corrL - 20) + "," + (corrT - 10));
                            b.setAttribute("d", "M" + (corrL - 20) + " " + corrT + " L" + (corrL - connlib._endpointStag) + " " + corrT);
                            break;
                    }
                    bg.appendChild(a);
                    bg.appendChild(b);
                    break;
            }
        }
        for (let e of connlib._instance._connections) {

        }
        /*
        for (let e of this._endpoints) {
            let s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            if (!e.canvas) {
                e.canvas = new connlibCanvas();
            }
            s.id = e.guid;
            s.classList.add("canvas");
            s.classList.add("connlib-element");
            s.style.zIndex = e.source.style.zIndex + 1;
            switch (e.type) {
                case connlibEndpointType.DEFAULT:
                    s.style.height = 0;
                    s.style.width = 0;
                    s.style.left = e.left;
                    s.style.top = e.top;
                    break;
                case connlibEndpointType.ARROW:
                    let a = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    a.style.fill = "#373737";
                    a.style.strokeWidth = 1;
                    switch (e.direction) {
                        case connlibEdgeDirection.TOP:
                            s.style.left = e.left - 10;
                            s.style.top = e.top - 20;
                            s.style.height = 20;
                            s.style.width = 20;
                            a.setAttribute("points", "10,20 0,0 20,0");
                            break;
                        case connlibEdgeDirection.RIGHT:
                            s.style.left = e.left;
                            s.style.top = e.top - 10;
                            s.style.height = 20;
                            s.style.width = 20;
                            a.setAttribute("points", "0,10 20,0 20,20");
                            break;
                        case connlibEdgeDirection.BOTTOM:
                            s.style.left = e.left - 10;
                            s.style.top = e.top;
                            s.style.height = 20;
                            s.style.width = 20;
                            a.setAttribute("points", "10,0 20,20 0,20");
                            break;
                        case connlibEdgeDirection.LEFT:
                            s.style.left = e.left - 20;
                            s.style.top = e.top - 10;
                            s.style.height = 20;
                            s.style.width = 20;
                            a.setAttribute("points", "20,10 0,20 0,0");
                            break;
                    }
                    s.appendChild(a);
                    break;
            }
            document.getElementById(this.containerId).appendChild(s);
        }
        /*
        for (let c of this._connections) {
            let st = c.endpoints[0];
            let en = c.endpoints[1];
            let e1L = parseInt(st.bLeft / this._gridScale);
            let e1T = parseInt(st.bTop / this._gridScale);
            let e2L = parseInt(en.bLeft / this._gridScale);
            let e2T = parseInt(en.bTop / this._gridScale);
            if(
                e1L >= 0 && e1L <= this._internalGrid.width &&
                e1T >= 0 && e1T <= this._internalGrid.height &&
                e2L >= 0 && e2L <= this._internalGrid.width &&
                e2T >= 0 && e2T <= this._internalGrid.height
            ){
                let finder = new PF.IDAStarFinder({
                    allowDiagonal: false,
                    dontCrossCorners: false,
                    heuristic: PF.Heuristic.euclidean
                });

                let path = finder.findPath(e1L, e1T, e2L, e2T, this._internalGrid);
                
                if(path.length == 0){
                    console.log("no path found", c, e1L, e1T, e2L, e2T);
                    continue;
                }
                
               //let path = [];

                var minX = Math.min(...path.map(x => x[0]), st.aLeft, en.aLeft) - 1;
                var maxX = Math.max(...path.map(x => x[0]), st.aLeft, en.aLeft) + 1;
                var minY = Math.min(...path.map(x => x[1]), st.aTop, en.aTop) - 1;
                var maxY = Math.max(...path.map(x => x[1]), st.aTop, en.aTop) + 1;

                let s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                s.id = c.guid;
                s.classList.add("canvas");
                s.classList.add("connlib-element");
                s.style.top = minY;
                s.style.left = minX;
                s.style.width = maxX - minX;
                s.style.height = maxY - minY;

                document.getElementById(this.containerId).appendChild(s);

                var pS = "M" + (parseInt(c.endpoints[0].aLeft / this._gridScale) - minX)  + " " + (parseInt(c.endpoints[0].aTop / this._gridScale) - minY);
                for(let i in path){
                    pS += " L" + (path[i][0] - minX)  + " " + (path[i][1] - minY);
                }
                pS += " L" + (parseInt(c.endpoints[1].aLeft / this._gridScale) - minX)  + " " + (parseInt(c.endpoints[1].aTop / this._gridScale) - minY);
                let b = document.createElementNS("http://www.w3.org/2000/svg", "path");
                b.style.stroke = "#373737";
                b.style.strokeWidth = 2;
                b.setAttribute("fill", "transparent");
                b.setAttribute("d", pS);
                s.appendChild(b);
            }
        }
        */
    }

    staggedEndpoint() {

    }

    toggleRenderBlockingCells() {
        if (!this._gridCellsRendered) {
            this._gridCellsRendered = true;
            let elements = document.getElementsByClassName("connlib-element");
            for (let element of elements) element.style.display = "none";
            for (let rI in this._internalGrid.cells) {
                for (let cI in this._internalGrid.cells[rI]) {
                    if (this._renderCellsWalkable && this._internalGrid.cells[rI][cI].w == 1) {
                        connlib.point(this._internalGrid.cells[rI][cI], "green");
                    } else if (this._renderCellsNotWalkable && this._internalGrid.cells[rI][cI].w == 0) {
                        connlib.point(this._internalGrid.cells[rI][cI], "orange");
                    }
                }
            }
        } else {
            this.clear();
            this._gridCellsRendered = false;
            let elements = document.getElementsByClassName("connlib-element");
            for (let element of elements) element.style.display = "block";
        }
    }

    updateGrid() {
        let elements = document.getElementsByClassName("connlib-element");
        let elementRects = [...elements].map(x => x.getBoundingClientRect());
        let left = Math.min(...[...elementRects].map(x => x.left)) - this._gridPadding;
        let top = Math.min(...[...elementRects].map(x => x.top)) - this._gridPadding;
        let width = Math.max(...[...elementRects].map(x => x.right)) - left + (this._gridPadding);
        let height = Math.max(...[...elementRects].map(x => x.bottom)) - top + (this._gridPadding);
        let bg = document.getElementById("background-grid");
        bg.style.top = top;
        bg.style.left = left;
        bg.style.width = width;
        bg.style.height = height;
        this._internalGrid = new connlibGrid(width, height);
        let blocks = document.getElementsByClassName("connlib-block");
        for (let element of blocks) {
            let rect = element.getBoundingClientRect();
            let left = parseInt((rect.left - parseFloat(bg.style.left)) / this._gridScale);
            let right = parseInt((rect.right - parseFloat(bg.style.left)) / this._gridScale);
            let top = parseInt((rect.top - parseFloat(bg.style.top)) / this._gridScale);
            let bottom = parseInt((rect.bottom - parseFloat(bg.style.top)) / this._gridScale);
            for (var r = top; r <= bottom; r++) {
                for (var c = left; c <= right; c++) {
                    this._internalGrid.cells[r][c].w = 0;
                }
            }
        }


        /*
        this._internalGrid = new PF.Grid(parseInt(window.innerWidth/this._gridScale), parseInt(window.innerHeight/this._gridScale));
        */
        /*
        if(this._renderGrid){
            let ctx = bg.getContext("2d");
            ctx.clearRect(0, 0, bg.width, bg.height);
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#eaeaea";
            for(var current = 0; current <= window.innerWidth; current += this._gridScale){
                ctx.moveTo(current, 0);
                ctx.lineTo(current, window.innerHeight);
            }
            for(var current = 0; current <= window.innerHeight; current += this._gridScale){
                ctx.moveTo(0, current);
                ctx.lineTo(window.innerWidth, current);
            }
            ctx.stroke();
        }
        */
    }
}

class connlibConnection extends connlibRenderable {

    endpoints = [];

    constructor(guid, endpoints) {
        super();
        if (guid) {
            this.guid = guid;
        } else {
            connlibExt.overprintGuid(this, "guid");
        }
        if (Array.isArray(endpoints)) {
            for (let e of endpoints) {
                e.connection = this;
                this.endpoints.push(e);
            }
        }
        connlib.instance._connections.push(this);
    }

    calculatePath() {

    }

    connect(source, target) {
        let endpoints = connlibExt.calcEndpointPosition(source, target);
        for (let e of endpoints) {
            e.connection = this;
            this.endpoints.push(e);
        }
    }
}

class connlibEndpoint extends connlibRenderable {

    source = null;
    connection = null;
    left = null;
    top = null;
    type = connlibEndpointType.DEFAULT;
    direction = null;

    constructor(source, connection, positioning) {
        super();
        connlibExt.overprintGuid(this, "guid");
        if (source) this.source = source;
        if (connection) this.connection = connection;
        if (positioning) {
            this.left = positioning.left;
            this.top = positioning.top;
            this.direction = positioning.direction;
        }
        connlib.instance._endpoints.push(this);
    }

    get connGridE() {
        let bg = document.getElementById("background-grid");
        var corrL = this.left - parseFloat(bg.style.left);
        var corrT = this.top - parseFloat(bg.style.top);
        switch (this.direction) {
            case connlibEdgeDirection.TOP:
                corrT -= connlib._endpointStag;
                break;
            case connlibEdgeDirection.RIGHT:
                corrL += connlib._endpointStag;
                break;
            case connlibEdgeDirection.BOTTOM:
                corrT += connlib._endpointStag;
                break;
            case connlibEdgeDirection.LEFT:
                corrL -= connlib._endpointStag;
                break;
        }
        return connlib.instance._internalGrid.cells[parseInt(corrT)][parseInt(corrL)];
    }

    get gridE() {
        let bg = document.getElementById("background-grid");
        let corrL = this.left - parseFloat(bg.style.left);
        let corrT = this.top - parseFloat(bg.style.top);
        return connlib.instance._internalGrid.cells[parseInt(corrT)][parseInt(corrL)];
    }
}

class connlibCanvas extends connlibAbstractRenderable {

    object;

    constructor(object) {
        super();
        this.object = object;
        connlib.instance._canvas.push(this);
    }

}

class connlibGrid {

    width;
    height;
    cells;

    constructor(width, height) {
        this.cells = [];
        this.width = width;
        this.height = height;
        for (var r = 0; r < height; r++) {
            this.cells[r] = [];
            for (var c = 0; c < width; c++) {
                this.cells[r].push({ "r": r, "c": c, "w": 1 });
            }
        }
    }
}

const connlibEndpointType = {
    "DEFAULT": 0,
    "ARROW": 1
}


const connlibEdgeDirection = {
    "TOP": 0,
    "RIGHT": 1,
    "BOTTOM": 2,
    "LEFT": 3
}

class connlibExt {

    static guidMap = {};

    static calcEndpointPosition(element1, element2) {

        let mEl1 = this.calcMiddle(element1);
        let mEl2 = this.calcMiddle(element2);

        var element1Endpoint = null;
        var element2Endpoint = null;

        let fun = this.calcFunForTwoPoints(mEl1, mEl2);

        var p1 = {
            "top": mEl1.rect.y,
            "left": mEl1.rect.x
        };
        var p2 = {
            "top": mEl1.rect.y,
            "left": mEl1.rect.right
        };
        if (p1.left == p2.left) {
            let inter = this.getYForX(fun, p1.left);
            if (!inter.parallely && inter.left >= p1.left && inter.left <= p2.left && (element1Endpoint == null || this.eukDist(inter, mEl2) < this.eukDist(element1Endpoint, mEl2))) {
                element1Endpoint = inter;
                element1Endpoint.direction = connlibEdgeDirection.TOP;
            }
        } else {
            let side = this.calcFunForTwoPoints(p1, p2);
            let inter = this.calcIntersectionBetweenTwoFuncs(fun, side);
            if (!inter.parallely && inter.left >= p1.left && inter.left <= p2.left && (element1Endpoint == null || this.eukDist(inter, mEl2) < this.eukDist(element1Endpoint, mEl2))) {
                element1Endpoint = inter;
                element1Endpoint.direction = connlibEdgeDirection.TOP;
            }
        }
        p1 = {
            "top": mEl1.rect.y,
            "left": mEl1.rect.right
        };
        p2 = {
            "top": mEl1.rect.bottom,
            "left": mEl1.rect.right
        };
        if (p1.left == p2.left) {
            let inter = this.getYForX(fun, p1.left);
            if (!inter.parallely && inter.top >= p1.top && inter.top <= p2.top && (element1Endpoint == null || this.eukDist(inter, mEl2) < this.eukDist(element1Endpoint, mEl2))) {
                element1Endpoint = inter;
                element1Endpoint.direction = connlibEdgeDirection.RIGHT;
            }
        } else {
            let side = this.calcFunForTwoPoints(p1, p2);
            let inter = this.calcIntersectionBetweenTwoFuncs(fun, side);
            if (!inter.parallely && inter.top >= p1.top && inter.top <= p2.top && (element1Endpoint == null || this.eukDist(inter, mEl2) < this.eukDist(element1Endpoint, mEl2))) {
                element1Endpoint = inter;
                element1Endpoint.direction = connlibEdgeDirection.RIGHT;
            }
        }
        p1 = {
            "top": mEl1.rect.bottom,
            "left": mEl1.rect.right
        };
        p2 = {
            "top": mEl1.rect.bottom,
            "left": mEl1.rect.x
        };
        if (p1.left == p2.left) {
            let inter = this.getYForX(fun, p1.left);
            if (!inter.parallely && inter.left >= p2.left && inter.left <= p1.left && (element1Endpoint == null || this.eukDist(inter, mEl2) < this.eukDist(element1Endpoint, mEl2))) {
                element1Endpoint = inter;
                element1Endpoint.direction = connlibEdgeDirection.BOTTOM;
            }
        } else {
            let side = this.calcFunForTwoPoints(p1, p2);
            let inter = this.calcIntersectionBetweenTwoFuncs(fun, side);
            if (!inter.parallely && inter.left >= p2.left && inter.left <= p1.left && (element1Endpoint == null || this.eukDist(inter, mEl2) < this.eukDist(element1Endpoint, mEl2))) {
                element1Endpoint = inter;
                element1Endpoint.direction = connlibEdgeDirection.BOTTOM;
            }
        }
        p1 = {
            "top": mEl1.rect.bottom,
            "left": mEl1.rect.x
        };
        p2 = {
            "top": mEl1.rect.y,
            "left": mEl1.rect.x
        };
        if (p1.left == p2.left) {
            let inter = this.getYForX(fun, p1.left);
            if (!inter.parallely && inter.top >= p2.top && inter.top <= p1.top && (element1Endpoint == null || this.eukDist(inter, mEl2) < this.eukDist(element1Endpoint, mEl2))) {
                element1Endpoint = inter;
                element1Endpoint.direction = connlibEdgeDirection.LEFT;
            }
        } else {
            let side = this.calcFunForTwoPoints(p1, p2);
            let inter = this.calcIntersectionBetweenTwoFuncs(fun, side);
            if (!inter.parallely && inter.top >= p2.top && inter.top <= p1.top && (element1Endpoint == null || this.eukDist(inter, mEl2) < this.eukDist(element1Endpoint, mEl2))) {
                element1Endpoint = inter;
                element1Endpoint.direction = connlibEdgeDirection.LEFT;
            }
        }

        p1 = {
            "top": mEl2.rect.y,
            "left": mEl2.rect.x
        };
        p2 = {
            "top": mEl2.rect.y,
            "left": mEl2.rect.right
        };
        if (p1.left == p2.left) {
            let inter = this.getYForX(fun, p1.left);
            if (!inter.parallely && inter.left >= p1.left && inter.left <= p2.left && (element2Endpoint == null || this.eukDist(inter, mEl1) < this.eukDist(element2Endpoint, mEl1))) {
                element2Endpoint = inter;
                element2Endpoint.direction = connlibEdgeDirection.TOP;
            }
        } else {
            let side = this.calcFunForTwoPoints(p1, p2);
            let inter = this.calcIntersectionBetweenTwoFuncs(fun, side);
            if (!inter.parallely && inter.left >= p1.left && inter.left <= p2.left && (element2Endpoint == null || this.eukDist(inter, mEl1) < this.eukDist(element2Endpoint, mEl1))) {
                element2Endpoint = inter;
                element2Endpoint.direction = connlibEdgeDirection.TOP;
            }
        }
        p1 = {
            "top": mEl2.rect.y,
            "left": mEl2.rect.right
        };
        p2 = {
            "top": mEl2.rect.bottom,
            "left": mEl2.rect.right
        };
        if (p1.left == p2.left) {
            let inter = this.getYForX(fun, p1.left);
            if (!inter.parallely && inter.top >= p1.top && inter.top <= p2.top && (element2Endpoint == null || this.eukDist(inter, mEl1) < this.eukDist(element2Endpoint, mEl1))) {
                element2Endpoint = inter;
                element2Endpoint.direction = connlibEdgeDirection.RIGHT;
            }
        } else {
            let side = this.calcFunForTwoPoints(p1, p2);
            let inter = this.calcIntersectionBetweenTwoFuncs(fun, side);
            if (!inter.parallely && inter.top >= p1.top && inter.top <= p2.top && (element2Endpoint == null || this.eukDist(inter, mEl1) < this.eukDist(element2Endpoint, mEl1))) {
                element2Endpoint = inter;
                element2Endpoint.direction = connlibEdgeDirection.RIGHT;
            }
        }
        p1 = {
            "top": mEl2.rect.bottom,
            "left": mEl2.rect.right
        };
        p2 = {
            "top": mEl2.rect.bottom,
            "left": mEl2.rect.x
        };
        if (p1.left == p2.left) {
            let inter = this.getYForX(fun, p1.left);
            if (!inter.parallely && inter.left >= p2.left && inter.left <= p1.left && (element2Endpoint == null || this.eukDist(inter, mEl1) < this.eukDist(element2Endpoint, mEl1))) {
                element2Endpoint = inter;
                element2Endpoint.direction = connlibEdgeDirection.BOTTOM;
            }
        } else {
            let side = this.calcFunForTwoPoints(p1, p2);
            let inter = this.calcIntersectionBetweenTwoFuncs(fun, side);
            if (!inter.parallely && inter.left >= p2.left && inter.left <= p1.left && (element2Endpoint == null || this.eukDist(inter, mEl1) < this.eukDist(element2Endpoint, mEl1))) {
                element2Endpoint = inter;
                element2Endpoint.direction = connlibEdgeDirection.BOTTOM;
            }
        }
        p1 = {
            "top": mEl2.rect.bottom,
            "left": mEl2.rect.x
        };
        p2 = {
            "top": mEl2.rect.y,
            "left": mEl2.rect.x
        };
        if (p1.left == p2.left) {
            let inter = this.getYForX(fun, p1.left);
            if (!inter.parallely && inter.top >= p2.top && inter.top <= p1.top && (element2Endpoint == null || this.eukDist(inter, mEl1) < this.eukDist(element2Endpoint, mEl1))) {
                element2Endpoint = inter;
                element2Endpoint.direction = connlibEdgeDirection.LEFT;
            }
        } else {
            let side = this.calcFunForTwoPoints(p1, p2);
            let inter = this.calcIntersectionBetweenTwoFuncs(fun, side);
            if (!inter.parallely && inter.top >= p2.top && inter.top <= p1.top && (element2Endpoint == null || this.eukDist(inter, mEl1) < this.eukDist(element2Endpoint, mEl1))) {
                element2Endpoint = inter;
                element2Endpoint.direction = connlibEdgeDirection.LEFT;
            }
        }

        return [new connlibEndpoint(element1, null, element1Endpoint), new connlibEndpoint(element2, null, element2Endpoint)];
    }

    static calcFunForTwoPoints(mEl1, mEl2) {
        /**
         * I    y = mx + n
         * II   mEl1.top = m * mEl1.left + n
         * III  mEl2.top = m * mEl2.left + n
         * IV   mEl1.top - m * mEl1.left = mEl2.top - m * mEl2.left
         * V    - m * mEl1.left + m * mEl2.left = mEl2.top - mEl1.top
         * VI   m * (-mEl1.left + mEl2.left) = mEl2.top - mEl1.top
         */
        let m = (mEl2.top - mEl1.top) / (mEl2.left - mEl1.left);
        return {
            "m": m,
            "n": mEl1.top - (m * mEl1.left)
        };
    }

    static calcIntersectionBetweenTwoFuncs(fun1, fun2) {
        /**
         * I    fun1.m * x + fun1.n = fun2.m * x + fun2.n
         * II   x * (fun1.m - fun2.m) = fun2.n - fun1.n
         */
        if (fun1.m == fun2.m) {
            if (fun1.n == fun2.n) {
                return {
                    "parallely": true,
                    "identical": true,
                    "left": null,
                    "top": null
                };
            } else {
                return {
                    "parallely": true,
                    "identical": false,
                    "left": null,
                    "top": null
                };
            }
        }
        let x = (fun2.n - fun1.n) / (fun1.m - fun2.m);
        return {
            "parallely": false,
            "identical": false,
            "left": x,
            "top": fun1.m * x + fun1.n
        };
    }

    static calcMiddle(element) {
        let cR = element.getBoundingClientRect();
        let output = { "left": null, "top": null, "rect": cR };
        output.left = cR.x + (cR.width / 2);
        output.top = cR.y + (cR.height / 2);
        return output;
    }

    static eukDist(p1, p2) {
        return Math.sqrt(Math.pow(p1.left - p2.left, 2) + Math.pow(p1.top - p2.top, 2))
    }

    static getYForX(fun, xValue) {
        return {
            "parallely": false,
            "identical": false,
            "left": xValue,
            "top": fun.m * xValue + fun.n
        };
    }

    static IDAStar(source, target, direction) {
        console.log("start searching path: ", source, target);
        let start = new Date().getTime();
        var stack = {};
        var threshold = this.manhattenDistance(source, target);
        var passed = {};
        var path = [];
        stack[threshold.toString()] = {};
        stack[threshold.toString()][source.r] = source;
        passed[source.r.toString()] = [source.c];
        var found = false;
        let max = 15000;
        var i = 0;
        var s = source;
        s.d = direction;
        path.push(s);
        var collisionFlag = null;
        while (!found) {
            if (i == max) {
                console.log(stack);
                for (let dist in stack) {
                    for (let row in stack[dist]) {
                        if (stack[dist][row]) connlib.point(stack[dist][row], "red");
                    }
                }
                throw ("maximum number of loops reached!");
            }
            let frontier = this.surroundingManhattenMinimumCells(s, target);
            var next = null;
            for (let c of frontier) {
                if (!stack[c.d.toString()]) stack[c.d.toString()] = {};
                if (!stack[c.d.toString()][c.o.r.toString()]) {
                    stack[c.d.toString()][c.o.r.toString()] = c.o;
                }
                if (c.d < threshold) {
                    threshold = c.d;
                    if (collisionFlag) collisionFlag = null;
                }
                if (c.o.r == target.r && c.o.c == target.c) {
                    found = true;
                    stack[c.d.toString()][c.o.r.toString()].seq = i + 1;
                    break;
                }
                if (c.d == threshold && c.o.d == direction) {
                    if (s.r == c.o.r && s.c == c.o.c) {
                        console.log(frontier);
                        throw ("endless loop!");
                    }
                    next = c.o;
                }
            }

            if (found) continue;
            while (next == null) {
                while (collisionFlag) {
                    if (!cI) var cI = 1;
                    switch (collisionFlag.d) {
                        case connlibDir.T:
                            if (connlib.instance._internalGrid.cells[collisionFlag.r - 1][collisionFlag.c - cI].w) {
                                for(let fI = 1; fI < cI; fI++){
                                    let o = {
                                        "c": (collisionFlag.c-fI),
                                        "r": (collisionFlag.r),
                                        "d": connlibDir.L
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if(!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][(collisionFlag.r).toString()] = o;
                                }
                                next = { "c": (collisionFlag.c - cI), "r": (collisionFlag.r), "d": connlibDir.L };
                            } else if (connlib.instance._internalGrid.cells[collisionFlag.r - 1][collisionFlag.c + cI].w) {
                                for(let fI = 1; fI < cI; fI++){
                                    let o = {
                                        "c": (collisionFlag.c+fI),
                                        "r": (collisionFlag.r),
                                        "d": connlibDir.R
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if(!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][(collisionFlag.r).toString()] = o;
                                }
                                next = { "c": (collisionFlag.c + cI), "r": (collisionFlag.r), "d": connlibDir.R };
                            }
                            break;
                        case connlibDir.B:
                            if (connlib.instance._internalGrid.cells[collisionFlag.r + 1][collisionFlag.c - cI].w) {

                                next = { "c": (collisionFlag.c - cI), "r": (collisionFlag.r), "d": connlibDir.L };
                            } else if (connlib.instance._internalGrid.cells[collisionFlag.r + 1][collisionFlag.c + cI].w) {

                                next = { "c": (collisionFlag.c + cI), "r": (collisionFlag.r), "d": connlibDir.R };
                            }
                            break;
                        case connlibDir.R:
                            if (connlib.instance._internalGrid.cells[collisionFlag.r - cI][collisionFlag.c + 1].w) {
                                for (let fI = 1; fI < cI; fI++) {
                                    let o = {
                                        "c": (collisionFlag.c),
                                        "r": (collisionFlag.r - fI),
                                        "d": connlibDir.T
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][(collisionFlag.r - cI).toString()] = o;
                                }
                                next = { "c": (collisionFlag.c), "r": (collisionFlag.r - cI), "d": connlibDir.T };
                            } else if (connlib.instance._internalGrid.cells[collisionFlag.r + cI][collisionFlag.c + 1].w) {
                                for (let fI = 1; fI < cI; fI++) {
                                    let o = {
                                        "c": (collisionFlag.c),
                                        "r": (collisionFlag.r + fI),
                                        "d": connlibDir.B
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][(collisionFlag.r - cI).toString()] = o;
                                }
                                next = { "c": (collisionFlag.c), "r": (collisionFlag.r + cI), "d": connlibDir.B };
                            }
                            break;
                        case connlibDir.L:
                            if (connlib.instance._internalGrid.cells[collisionFlag.r - cI][collisionFlag.c - 1].w) {
                                for (let fI = 1; fI < cI; fI++) {
                                    let o = {
                                        "c": (collisionFlag.c),
                                        "r": (collisionFlag.r - fI),
                                        "d": connlibDir.T
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][(collisionFlag.r - cI).toString()] = o;
                                }
                                next = { "c": (collisionFlag.c), "r": (collisionFlag.r - cI), "d": connlibDir.T };

                            } else if (connlib.instance._internalGrid.cells[collisionFlag.r + cI][collisionFlag.c - 1].w) {
                                for (let fI = 1; fI < cI; fI++) {
                                    let o = {
                                        "c": (collisionFlag.c),
                                        "r": (collisionFlag.r + fI),
                                        "d": connlibDir.B
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][(collisionFlag.r - cI).toString()] = o;
                                }
                                next = { "c": (collisionFlag.c), "r": (collisionFlag.r + cI), "d": connlibDir.B };

                            }
                            break;
                    }
                    if (next) {
                        collisionFlag = null;
                        let d = this.manhattenDistance(next, target);
                        if (!stack[d]) stack[d.toString()] = {};
                        stack[d.toString()][(next.r).toString()] = next;
                        threshold = d;
                        collisionFlag
                    }
                    cI++;
                }
                for (let i in stack[threshold.toString()]) {
                    try {
                        if (!passed[threshold.toString()] || !passed[threshold.toString()].includes(stack[threshold.toString()][i].c)) {
                            next = stack[threshold.toString()][i];
                            break;
                        }
                    } catch (e) {
                        console.log(next, stack, passed, threshold);
                        throw (e);
                    }
                }
                if (next == null && !collisionFlag){
                    collisionFlag = s;
                    console.log("pushed: ", s);
                    path.push(collisionFlag);
                }
            }
            if(s.d != next.d){
                console.log("pushed: ", s, ", next: ", next);
                connlib.point(s, "red");
                path.push(s);
            }
            s = next;
            if (!passed[threshold.toString()]) passed[threshold.toString()] = [s.c];
            else passed[threshold.toString()].push(s.c);
            try {
                stack[threshold.toString()][s.r].seq = i;
            } catch (e) {
                console.log(stack, threshold, i, s);
                throw (e);
            }
            if (!s) {
                console.log(stack, c.o);
                throw ("error: cannot find next node!");
            }
            i++;
        }
        console.log("pushed: ", target);
        path.push(target);
        for (let point of path) connlib.point(point, "red");
        console.log("time required: (ms) " + (new Date().getTime() - start));
    }
    /**
     * OLD VERSION - NOT WORKING PROPERLY
     * @param {*} source 
     * @param {*} target 
     * @param {*} d 
     * @param {*} complete 
     */
    static idastar(source, target, d, complete) {
        console.log("start searching path: ", source, target);
        let grid = connlib._instance._internalGrid.cells;
        let start = new Date().getTime();
        let path = [];
        var found = false;
        var s = source;
        let max = 4000;
        var i = 0;
        while (!found) {
            if (i == max) {
                console.log(path);
                throw ("infinity loop recognized!");
            }
            if (s.r == target.r && s.c == target.c) {
                path.push(s);
                found = true;
            } else {
                let frontier = this.surroundingManhattenMinimumCells(s, target, grid);
                if (frontier.length == 0) {
                    console.log(path);
                    throw ("no solution found!");
                }

                var r = frontier.find(x => x.d == d);
                if (!r) r = frontier[0];

                s = r.o;
                grid[s.r][s.c].p = 1;
                if (complete || i == 0 || d != s.d) path.push(s);
                d = s.d;
            }
            i++;
        }
        console.log("time required: (ms) " + (new Date().getTime() - start));
        for (let point of path) connlib.point(point, "red");
        return path;
    }
    /**
     * the method returns the 
     * @param {*} source centered cell
     * @param {*} target connection's target for manhatten distance
     */
    static surroundingManhattenMinimumCells(source, target) {
        let s = this.surroundingCellsNoDiag(source);
        return s.map(x => {
            return { "d": this.manhattenDistance(x, target), "o": x }
        });
    }
    /**
     * the method returns all grid cells that sourrounds the centered cell
     * the result contains a direction
     * @param {*} cell center
     */
    static surroundingCellsNoDiag(cell) {
        var o = [];
        let grid = connlib.instance._internalGrid.cells;
        var c;

        if (grid[cell.r - 1] && grid[cell.r - 1][cell.c] && grid[cell.r - 1][cell.c].w == 1) {
            c = grid[cell.r - 1][cell.c];
            o.push({ "c": c.c, "r": c.r, "d": connlibDir.T });
        }
        if (grid[cell.r] && grid[cell.r][cell.c + 1] && grid[cell.r][cell.c + 1].w == 1) {
            c = grid[cell.r][cell.c + 1];
            o.push({ "c": c.c, "r": c.r, "d": connlibDir.R });
        }
        if (grid[cell.r + 1] && grid[cell.r + 1][cell.c] && grid[cell.r + 1][cell.c].w == 1) {
            c = grid[cell.r + 1][cell.c];
            o.push({ "c": c.c, "r": c.r, "d": connlibDir.B });
        }
        if (grid[cell.r] && grid[cell.r][cell.c - 1] && grid[cell.r][cell.c - 1].w == 1) {
            c = grid[cell.r][cell.c - 1];
            o.push({ "c": c.c, "r": c.r, "d": connlibDir.L });
        }

        return o;
    }
    /**
     * the method returns the manhatten distance between the two points
     * @param {*} p1 first point
     * @param {*} p2 second point
     */
    static manhattenDistance(p1, p2) {
        return Math.abs(p1.r - p2.r) + Math.abs(p1.c - p2.c);
    }
    /**
     * the method overwrites the instance's guid attribute with a auto generated new one
     * @param {*} instance object to update guid
     * @param {*} attr guid attribute's name
     */
    static overprintGuid(instance, attr) {
        if (!attr) attr = "guid";
        let guid = 'guidxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        if (typeof (this.guidMap[guid]) != "undefined") {
            return this.overprintGuid();
        } else {
            instance[attr] = guid;
            this.guidMap[guid] = instance;
            return instance;
        }
    }
}

const connlibDir = {
    "T": 1,
    "R": 2,
    "B": 3,
    "L": 4
}