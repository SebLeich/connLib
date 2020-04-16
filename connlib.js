class connlibAbstractRenderable {

    guid;

    constructor() {

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
    _breakPoints = [];
    _canvas = [];
    _gridScale = 10;
    _renderGrid = false;
    _internalGrid;
    _lines = [];

    _moveX = 0;
    _moveY = 0;
    _moveStep = 20;
    _invertMoveDirection = false;
    _gridPadding = 80;

    _renderCellsWalkable = false;
    _renderCellsNotWalkable = true;
    _gridCellsRendered = false;

    container = null;

    // how far should the endpoints stand
    static _endpointStag = 30;

    static dragFlag = null;

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
        this.instance.updateGrid();
    }
    /**
     * the method clears the background svg
     */
    clear() {
        if (!this.instance) return;
        for (let e of this.instance._endpoints) e.clear();
        for (let c of this.instance._connections) c.clear();
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
        this.container = document.getElementById(value);
    }

    static createInstance() {
        if (connlib._instance == null) connlib._instance = new connlib();
        return connlib._instance;
    }

    static init(containerId) {
        let instance = this.createInstance();
        instance.containerId = containerId;
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
        window.addEventListener("mousedown", (event) => {
            if(this.dragFlag == null){
                event.preventDefault();
                event.stopPropagation();
                this.dragFlag = new connlibPan(event.clientX, event.clientY, instance._moveX, instance._moveY);
            }
        });
        window.addEventListener("mousemove", (event) => {
            if(!this.dragFlag) return;
            switch(this.dragFlag.constructor){
                case connlibLine:
                    switch (this.dragFlag.type) {
                        case connlibLine.lineType.HORIZONTAL:
                            this.dragFlag.source.setTop(event.clientY - parseFloat(connlib.instance.container.style.top));
                            this.dragFlag.target.setTop(event.clientY - parseFloat(connlib.instance.container.style.top));
                            break;
                        case connlibLine.lineType.VERTICAL:
                            this.dragFlag.source.setLeft(event.clientX - parseFloat(connlib.instance.container.style.left));
                            this.dragFlag.target.setLeft(event.clientX - parseFloat(connlib.instance.container.style.left));
                            break;
                    }
                    break;
                case connlibPan:
                    let t = this.dragFlag.calculateTransform(event.clientX, event.clientY);
                    connlib.instance._moveX = t.x;
                    connlib.instance._moveY = t.y;
                    connlib.applyTransform();
                    break;
            }
        });
        window.addEventListener("mouseup", () => {
            this.dragFlag = null;
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

    static offset(element) {
        let o = { "top": null, "left": null, "height": null, "width": null };
        if (element) {
            var rect = element.getBoundingClientRect();
            o.top = rect.top + document.body.scrollTop;
            o.left = rect.left + document.body.scrollLeft;
        }
        return o;
    }

    static point(point, color) {
        let bg = this.instance.container;
        let p = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        p.setAttribute("cx", point.c);
        p.setAttribute("cy", point.r);
        p.setAttribute("r", 1);
        p.setAttribute("fill", color);
        bg.appendChild(p);
    }

    render() {
        this.clear();
        this.updateGrid();
        for (let e of connlib._instance._endpoints) e.render();
        for (let c of connlib._instance._connections) {
            c.calculatePath();
            c.render();
        }
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
        let width = Math.ceil((Math.max(...[...elementRects].map(x => x.right)) - left + (this._gridPadding)) / this._gridScale) * this._gridScale;
        let height = Math.ceil((Math.max(...[...elementRects].map(x => x.bottom)) - top + (this._gridPadding)) / this._gridScale) * this._gridScale;
        let bg = document.getElementById("background-grid");
        bg.style.top = top;
        bg.style.left = left;
        bg.style.width = width;
        bg.style.height = height;
        this._internalGrid = new connlibGrid(width, height, this._gridScale);
        let blocks = document.getElementsByClassName("connlib-block");
        for (let element of blocks) {
            let rect = element.getBoundingClientRect();
            let left = parseInt((rect.left - parseFloat(bg.style.left)));
            let right = parseInt((rect.right - parseFloat(bg.style.left)));
            let top = parseInt((rect.top - parseFloat(bg.style.top)));
            let bottom = parseInt((rect.bottom - parseFloat(bg.style.top)));
            for (var r = top; r <= bottom; r += this._gridScale) {
                for (var c = left; c <= right; c += this._gridScale) {
                    this._internalGrid.cells[r][c].w = 0;
                }
            }
        }
    }
}
/**
 * the class binds a connlib pan event
 */
class connlibPan {
    mouseX;
    mouseY;
    initialXTransform;
    initialYTransform;
    constructor(mouseX, mouseY, initialXTransform, initialYTransform){
        this.mouseX = mouseX;
        this.mouseY = mouseY;
        this.initialXTransform = initialXTransform;
        this.initialYTransform = initialYTransform;
    }
    /**
     * the method returns the calculation
     * @param {*} point 
     */
    calculateTransform(x, y){
        return { x: (this.initialXTransform + (x - this.mouseX)) * 1, y: (this.initialYTransform + (y - this.mouseY)) * 1 };
    }
}
/**
 * the class contains a connection
 */
class connlibConnection extends connlibAbstractRenderable {

    endpoints = [];
    pathPoints = [];
    lines = [];
    _rendered = false;
    /**
     * the constructor creates a new instance of a connection
     */
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
    /**
     * the method allows developers to render calculated paths recursively and renders the line
     */
    addPoint(point) {
        this.pathPoints.push(point);
        if (this.pathPoints.length > 1) {
            let last = this.pathPoints[this.pathPoints.length - 2];
            let bg = document.getElementById("background-grid");
            let d = document.createElementNS("http://www.w3.org/2000/svg", "path");
            d.style.stroke = "#373737";
            d.style.strokeWidth = 1;
            d.setAttribute("d", "M" + last.c + " " + last.r + " L" + point.c + " " + point.r);
            bg.appendChild(d);
            this.lines.push(d);
            this._rendered = true;
        }
    }
    /**
     * the method returns the dom visualization of the current connection
     */
    clear() {
        for (let l of this.lines) l.clear();
        this._rendered = false;
    }
    /**
     * the method calculates the connections path
     */
    calculatePath() {
        this.pathPoints = [];
        if (this.isRendered()) this.clear();
        var direction;
        switch (this.endpoints[0].direction) {
            case connlibEdgeDirection.TOP:
                direction = connlibDir.T;
                break;
            case connlibEdgeDirection.RIGHT:
                direction = connlibDir.R;
                break;
            case connlibEdgeDirection.BOTTOM:
                direction = connlibDir.B;
                break;
            case connlibEdgeDirection.LEFT:
                direction = connlibDir.L;
                break;
        }
        let source = this.endpoints[0].connGridE;
        let target = this.endpoints[1].connGridE;
        this.pathPoints = connlibExt.IDAStar(source, target, direction);
        for (var i = 1; i < this.pathPoints.length; i++) {
            let source = this.pathPoints[i - 1];
            let target = this.pathPoints[i];
            source.connection = this;
            target.connection = this;
            let l = connlibLine.connect(source, target);
            l.connection = this;
            this.lines.push(l);
        }
    }
    /**
     * the method enables user's to connect two points
     * @param {*} source 
     * @param {*} target 
     */
    connect(source, target) {
        this.endpoints = [];
        let endpoints = connlibExt.calcEndpointPosition(source, target);
        for (let e of endpoints) {
            e.connection = this;
            this.endpoints.push(e);
        }
    }
    /**
     * the method returns whether the current connection is rendered or not
     */
    isRendered() {
        return this._rendered;
    }
    /**
     * the method returns the path's complete svg d string
     */
    get pathString() {
        var o = "";
        for (var i = 0; i < this.pathPoints.length; i++) {
            if (i == 0) {
                o = "M" + this.pathPoints[i].c + " " + this.pathPoints[i].r;
            } else {
                o += " L" + this.pathPoints[i].c + " " + this.pathPoints[i].r;
            }
        }
        return o;
    }
    /**
     * the method renders the connection's path
     */
    render() {
        if (this.isRendered()) this.clear();
        for (let l of this.lines) l.render();
        this._rendered = true;
    }
}

class connlibLine extends connlibAbstractRenderable {
    hsvg;
    lsvg;
    type;
    connection;
    source;
    target;
    _rendered = false;
    _initial = 0;
    constructor() {
        super();
        connlibExt.overprintGuid(this, "guid");
        connlib.instance._lines.push(this);
    }
    /**
     * the method removes the element from the dom
     */
    clear() {
        if (this._rendered) {
            this.lsvg.parentNode.removeChild(this.lsvg);
            this.hsvg.parentNode.removeChild(this.hsvg);
            this._rendered = false;
        }
    }
    static connect(s, t) {
        let output = new connlibLine();
        output.source = s;
        output.target = t;
        output.lsvg = document.createElementNS("http://www.w3.org/2000/svg", "path");
        output.lsvg.style.stroke = "#373737";
        output.lsvg.style.strokeWidth = 1;
        output.hsvg = document.createElementNS("http://www.w3.org/2000/svg", "path");
        output.hsvg.style.stroke = "transparent";
        output.hsvg.style.strokeWidth = 10;
        output.hsvg.style.zIndex = 5;
        if (s.r == t.r) {
            output.hsvg.classList.add("connlib-connection-hor");
            output.type = this.lineType.HORIZONTAL;
        }
        else if (s.c == t.c) {
            output.hsvg.classList.add("connlib-connection-ver");
            output.type = this.lineType.VERTICAL;
        }
        output.lsvg.setAttribute("d", "M" + s.c + " " + s.r + " L" + t.c + " " + t.r);
        output.hsvg.setAttribute("d", "M" + s.c + " " + s.r + " L" + t.c + " " + t.r);
        s.subscribePositionChange(() => output.updatePosition());
        t.subscribePositionChange(() => output.updatePosition());
        return output;
    }
    static lineType = { "HORIZONTAL": 1, "VERTICAL": 2 }
    /**
     * the method renders the current line
     */
    render() {
        connlib.instance.container.appendChild(this.lsvg);
        connlib.instance.container.appendChild(this.hsvg);
        this.hsvg.addEventListener("mousedown", (event) => {
            event.stopPropagation();
            event.preventDefault();
            connlib.dragFlag = this;
            switch (this.type) {
                case connlibLine.lineType.HORIZONTAL:
                    this._initial = event.offsetY;
                    break;
                case connlibLine.lineType.VERTICAL:
                    this._initial = event.offsetX;
                    break;
            }
        });
        this._rendered = true;
    }

    updatePosition() {
        this.lsvg.setAttribute("d", "M" + this.source.c + " " + this.source.r + " L" + this.target.c + " " + this.target.r);
        this.hsvg.setAttribute("d", "M" + this.source.c + " " + this.source.r + " L" + this.target.c + " " + this.target.r);
    }
}

class connlibEndpoint extends connlibAbstractRenderable {

    source = null;
    connection = null;
    left = null;
    top = null;
    type = connlibEndpointType.DEFAULT;
    direction = null;
    a = null; // rendered anchor point
    p = null; // rendered, stagged anchor path
    _connGridE = null;

    onPositionChangeHandlers = [];

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
        source.addEventListener("positionChange", (event) => {
            console.log("update ", this, event);
        });
    }
    /**
     *  the method returns the endpoint's connectable endpoint
     */
    get connGridE(){
        if(!this._connGridE) this.calculateCGridE();
        return this._connGridE;
    }
    /**
     * the method calculates the endpoint's connectable endpoint
     */
    calculateCGridE(){
        let bg = connlib.instance.container;
        var corrL = Math.ceil((this.left - parseFloat(bg.style.left)) / connlib.instance._gridScale) * connlib.instance._gridScale;
        var corrT = Math.ceil((this.top - parseFloat(bg.style.top)) / connlib.instance._gridScale) * connlib.instance._gridScale;
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
        this._connGridE = connlib.instance._internalGrid.cells[parseInt(corrT)][parseInt(corrL)];
    }
    /**
     * the method removes the current enpoint from the dom
     */
    clear() {
        if (this.a && this.p) {
            this.a.parentNode.removeChild(this.a);
            this.p.parentNode.removeChild(this.p);
            this.a = null;
            this.p = null;
        } else {
            console.warn("cannot remove endpoint from dom", this);
        }
    }

    get gridE() {
        let bg = document.getElementById("background-grid");
        var corrL = Math.ceil((this.left - parseFloat(bg.style.left)) / connlib.instance._gridScale) * connlib.instance._gridScale;
        var corrT = Math.ceil((this.top - parseFloat(bg.style.top)) / connlib.instance._gridScale) * connlib.instance._gridScale;
        return connlib.instance._internalGrid.cells[parseInt(corrT)][parseInt(corrL)];
    }
    /**
     * the method returns whether the current endpoint is rendered on the dom
     */
    isRendered() {
        if (this.a && this.p) return true;
        return false;
    }
    /**
     * the method renders the current endpoint
     */
    render() {
        if (this.isRendered()) this.clear();
        let corrL = Math.ceil((this.left - parseFloat(connlib.instance.container.style.left)) / connlib.instance._gridScale) * connlib.instance._gridScale;
        let corrT = Math.ceil((this.top - parseFloat(connlib.instance.container.style.top)) / connlib.instance._gridScale) * connlib.instance._gridScale;
        switch (this.type) {
            case connlibEndpointType.DEFAULT:
                this.a = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                this.a.setAttribute("cx", corrL);
                this.a.setAttribute("cy", corrT);
                this.a.setAttribute("r", 5);
                this.a.setAttribute("fill", "black");
                this.p = document.createElementNS("http://www.w3.org/2000/svg", "path");
                this.p.style.stroke = "#373737";
                this.p.style.strokeWidth = 1;
                switch (this.direction) {
                    case connlibEdgeDirection.TOP:
                        this.p.setAttribute("d", "M" + corrL + " " + corrT + " L" + corrL + " " + (corrT - connlib._endpointStag));
                        break;
                    case connlibEdgeDirection.RIGHT:
                        this.p.setAttribute("d", "M" + corrL + " " + corrT + " L" + (corrL + connlib._endpointStag) + " " + corrT);
                        break;
                    case connlibEdgeDirection.BOTTOM:
                        this.p.setAttribute("d", "M" + corrL + " " + corrT + " L" + corrL + " " + (corrT + connlib._endpointStag));
                        break;
                    case connlibEdgeDirection.LEFT:
                        this.p.setAttribute("d", "M" + corrL + " " + corrT + " L" + (corrL - connlib._endpointStag) + " " + corrT);
                        break;
                }
                break;
            case connlibEndpointType.ARROW:
                this.a = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                this.a.style.fill = "#373737";
                this.a.style.strokeWidth = 1;
                this.p = document.createElementNS("http://www.w3.org/2000/svg", "path");
                this.p.style.stroke = "#373737";
                this.p.style.strokeWidth = 1;
                switch (this.direction) {
                    case connlibEdgeDirection.TOP:
                        this.a.setAttribute("points", corrL + "," + corrT + " " + (corrL - 10) + "," + (corrT - 20) + " " + (corrL + 10) + "," + (corrT - 20));
                        this.p.setAttribute("d", "M" + corrL + " " + (corrT - 20) + " L" + corrL + " " + (corrT - connlib._endpointStag));
                        break;
                    case connlibEdgeDirection.RIGHT:
                        this.a.setAttribute("points", corrL + "," + corrT + " " + (corrL + 20) + "," + (corrT + 10) + " " + (corrL + 20) + "," + (corrT - 10));
                        this.p.setAttribute("d", "M" + (corrL + 20) + " " + corrT + " L" + (corrL + connlib._endpointStag) + " " + corrT);
                        break;
                    case connlibEdgeDirection.BOTTOM:
                        this.a.setAttribute("points", corrL + "," + corrT + " " + (corrL + 10) + "," + (corrT + 20) + " " + (corrL - 10) + "," + (corrT + 20));
                        this.p.setAttribute("d", "M" + corrL + " " + (corrT + 20) + " L" + corrL + " " + (corrT + connlib._endpointStag));
                        break;
                    case connlibEdgeDirection.LEFT:
                        this.a.setAttribute("points", corrL + "," + corrT + " " + (corrL - 20) + "," + (corrT + 10) + " " + (corrL - 20) + "," + (corrT - 10));
                        this.p.setAttribute("d", "M" + (corrL - 20) + " " + corrT + " L" + (corrL - connlib._endpointStag) + " " + corrT);
                        break;
                }
                break;
        }
        if (this.a && this.p) {
            connlib.instance.container.appendChild(this.a);
            connlib.instance.container.appendChild(this.p);
        }
    }
    /**
     * the method updates the endpoint's left coordinate
     */
    setLeft(left) {
        this.left = left;
        if (this.isRendered()) {
            this.render();
            this.connection.calculatePath();
            this.connection.render();
        }
        for (let e of this.onPositionChangeHandlers) e(this);
    }
    /**
     * the method updates the endpoint's top coordinate
     */
    setTop(top) {
        this.top = top;
        if (this.isRendered()) {
            this.render();
            this.connection.calculatePath()
            this.connection.render();
        }
        for (let e of this.onPositionChangeHandlers) e(this);
    }

    subscribePositionChange(handler) {
        this.onPositionChangeHandlers.push(handler);
    }
}

class connlibBreakPoint extends connlibAbstractRenderable {

    connection = null;
    lines = [];
    c = null;
    r = null;

    onPositionChangeHandlers = [];

    constructor(object) {
        super();
        connlibExt.overprintGuid(this, "guid");
        connlib.instance._breakPoints.push(this);
        this.c = object.c;
        this.r = object.r;
    }
    /**
     * the method updates the endpoint's left coordinate
     */
    setLeft(left) {
        this.c = left;
        for (let e of this.onPositionChangeHandlers) e(this);
    }
    /**
     * the method updates the endpoint's top coordinate
     */
    setTop(top) {
        this.r = top;
        for (let e of this.onPositionChangeHandlers) e(this);
    }
    /**
     * the method subscribes a position change handler
     */
    subscribePositionChange(handler) {
        this.onPositionChangeHandlers.push(handler);
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
    scale;
    cells;

    constructor(width, height, scale) {
        this.cells = {};
        this.width = width;
        this.height = height;
        this.scale = scale;
        for (var r = 0; r < height; r += scale) {
            this.cells[r] = {};
            for (var c = 0; c < width; c += scale) {
                this.cells[r][c] = { "r": r, "c": c, "w": 1 };
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

    /**
     * the algorithm calculates the given connections path and renders the lines immediately
     * @param {*} connection 
     * @param {*} source 
     * @param {*} target 
     * @param {*} direction 
     */
    static IDAStarRecursively(connection, source, target, direction) {
        var stack = {};
        var threshold = this.manhattenDistance(source, target);
        stack[threshold.toString()] = {};
        stack[threshold.toString()][source.r] = source;
        var found = false;
        let max = 15000;
        var i = 0;
        var s = source;
        s.d = direction;
        s.p = 1;
        connection.addPoint(s);
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
                } else continue;
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
                for (let i in stack[threshold.toString()]) {
                    if (stack[threshold.toString()][i].p != 1) {
                        next = stack[threshold.toString()][i];
                        break;
                    }
                }
                while (collisionFlag) {
                    if (!cI) var cI = connlib.instance._gridScale;
                    switch (collisionFlag.d) {
                        case connlibDir.T:
                            if (connlib.instance._internalGrid.cells[collisionFlag.r + connlib.instance._gridScale][collisionFlag.c - cI].w) {
                                for (let fI = connlib.instance._gridScale; fI < cI; fI += connlib.instance._gridScale) {
                                    let o = {
                                        "c": (collisionFlag.c - fI),
                                        "r": (collisionFlag.r),
                                        "d": connlibDir.L
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][o.r.toString()] = o;
                                }
                                next = { "c": (collisionFlag.c - cI), "r": (collisionFlag.r), "d": connlibDir.L };
                            } else if (connlib.instance._internalGrid.cells[collisionFlag.r + connlib.instance._gridScale][collisionFlag.c + cI].w) {
                                for (let fI = connlib.instance._gridScale; fI < cI; fI += connlib.instance._gridScale) {
                                    let o = {
                                        "c": (collisionFlag.c + fI),
                                        "r": (collisionFlag.r),
                                        "d": connlibDir.R
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][o.r.toString()] = o;
                                }
                                next = { "c": (collisionFlag.c + cI), "r": (collisionFlag.r), "d": connlibDir.R };
                            }
                            break;
                        case connlibDir.B:
                            if (connlib.instance._internalGrid.cells[collisionFlag.r + connlib.instance._gridScale][collisionFlag.c - cI].w) {
                                for (let fI = connlib.instance._gridScale; fI < cI; fI += connlib.instance._gridScale) {
                                    let o = {
                                        "c": (collisionFlag.c - fI),
                                        "r": (collisionFlag.r),
                                        "d": connlibDir.L
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][o.r.toString()] = o;
                                }
                                next = { "c": (collisionFlag.c - cI), "r": (collisionFlag.r), "d": connlibDir.L };
                            } else if (connlib.instance._internalGrid.cells[collisionFlag.r + connlib.instance._gridScale][collisionFlag.c + cI].w) {
                                for (let fI = connlib.instance._gridScale; fI < cI; fI += connlib.instance._gridScale) {
                                    let o = {
                                        "c": (collisionFlag.c + fI),
                                        "r": (collisionFlag.r),
                                        "d": connlibDir.R
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][o.r.toString()] = o;
                                }
                                next = { "c": (collisionFlag.c + cI), "r": (collisionFlag.r), "d": connlibDir.R };
                            }
                            break;
                        case connlibDir.R:
                            if (connlib.instance._internalGrid.cells[collisionFlag.r - cI][collisionFlag.c + connlib.instance._gridScale].w) {
                                for (let fI = connlib.instance._gridScale; fI < cI; fI += connlib.instance._gridScale) {
                                    let o = {
                                        "c": (collisionFlag.c),
                                        "r": (collisionFlag.r - fI),
                                        "d": connlibDir.T
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][o.r.toString()] = o;
                                }
                                next = { "c": (collisionFlag.c), "r": (collisionFlag.r - cI), "d": connlibDir.T };
                            } else if (connlib.instance._internalGrid.cells[collisionFlag.r + cI][collisionFlag.c + connlib.instance._gridScale].w) {
                                for (let fI = connlib.instance._gridScale; fI < cI; fI += connlib.instance._gridScale) {
                                    let o = {
                                        "c": (collisionFlag.c),
                                        "r": (collisionFlag.r + fI),
                                        "d": connlibDir.B
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][o.r.toString()] = o;
                                }
                                next = { "c": (collisionFlag.c), "r": (collisionFlag.r + cI), "d": connlibDir.B };
                            }
                            break;
                        case connlibDir.L:
                            if (connlib.instance._internalGrid.cells[collisionFlag.r - cI][collisionFlag.c + connlib.instance._gridScale].w) {
                                for (let fI = connlib.instance._gridScale; fI < cI; fI += connlib.instance._gridScale) {
                                    let o = {
                                        "c": (collisionFlag.c),
                                        "r": (collisionFlag.r - fI),
                                        "d": connlibDir.T
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][o.r.toString()] = o;
                                }
                                next = { "c": (collisionFlag.c), "r": (collisionFlag.r - cI), "d": connlibDir.T };

                            } else if (connlib.instance._internalGrid.cells[collisionFlag.r + cI][collisionFlag.c + connlib.instance._gridScale].w) {
                                for (let fI = connlib.instance._gridScale; fI < cI; fI += connlib.instance._gridScale) {
                                    let o = {
                                        "c": (collisionFlag.c),
                                        "r": (collisionFlag.r + fI),
                                        "d": connlibDir.B
                                    };
                                    let d = this.manhattenDistance(o, target);
                                    if (!stack[d]) stack[d.toString()] = {};
                                    stack[d.toString()][o.r.toString()] = o;
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
                    }
                    cI += connlib.instance._gridScale;
                }
                if (next == null && !collisionFlag) {
                    collisionFlag = s;
                    direction = collisionFlag.d;
                }
            }
            if (s.d != next.d) {
                connection.addPoint(s);
            }
            s = next;
            if (!s) {
                console.log(stack, c.o);
                throw ("error: cannot find next node!");
            }
            s.p = 1;
            s.seq = i;
            i++;
        }
        connection.addPoint(target);
    }
    /**
     * the algorithm calculates the given connections path and renders the lines immediately
     * @param {*} connection 
     * @param {*} source 
     * @param {*} target 
     * @param {*} direction 
     */
    static IDAStar(source, target, direction) {
        var costs = {}
        var stack = {};
        var threshold = this.manhattenDistance(source, target);
        stack[threshold.toString()] = {};
        stack[threshold.toString()][source.r] = source;
        var found = false;
        let max = 5000;
        var i = 0;
        var s = source;
        s.d = direction;
        s.p = 1;
        s.a = [];
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
                } else continue;
                if (c.d < threshold) {
                    threshold = c.d;
                    if (collisionFlag) collisionFlag = null;
                }
                if (c.o.r == target.r && c.o.c == target.c) {
                    found = true;
                    stack[c.d.toString()][c.o.r.toString()].seq = i + 1;
                    this.updateCostsAndGetAnchestors(costs, s);
                    let path = this.updateCostsAndGetAnchestors(costs, target);
                    let breakPoints = [];
                    for (let pI in path) {
                        if (pI == 0) {
                            breakPoints.push(new connlibBreakPoint(path[pI]));
                        } else {
                            if (path[pI - 1].d != path[pI].d) breakPoints.push(new connlibBreakPoint(path[pI - 1]));
                        }
                    }
                    breakPoints.push(new connlibBreakPoint(target));
                    return breakPoints;
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

            var i2 = 0;
            while (next == null) {
                if (i2 > max) throw ("infinity loop");
                for (let i in stack[threshold.toString()]) {
                    if (stack[threshold.toString()][i].p != 1) {
                        next = stack[threshold.toString()][i];
                        break;
                    }
                }
                if (next == null) {
                    threshold++;
                }
                i2++;
            }
            next.a = this.updateCostsAndGetAnchestors(costs, s);
            s = next;
            if (!s) {
                console.log(stack, c.o);
                throw ("error: cannot find next node!");
            }
            s.p = 1;
            s.seq = i;
            i++;
        }
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

        if (grid[cell.r - connlib.instance._gridScale] && grid[cell.r - connlib.instance._gridScale][cell.c] && grid[cell.r - connlib.instance._gridScale][cell.c].w == 1) {
            c = grid[cell.r - connlib.instance._gridScale][cell.c];
            o.push({ "c": c.c, "r": c.r, "d": connlibDir.T });
        }
        if (grid[cell.r] && grid[cell.r][cell.c + connlib.instance._gridScale] && grid[cell.r][cell.c + connlib.instance._gridScale].w == 1) {
            c = grid[cell.r][cell.c + connlib.instance._gridScale];
            o.push({ "c": c.c, "r": c.r, "d": connlibDir.R });
        }
        if (grid[cell.r + connlib.instance._gridScale] && grid[cell.r + connlib.instance._gridScale][cell.c] && grid[cell.r + connlib.instance._gridScale][cell.c].w == 1) {
            c = grid[cell.r + connlib.instance._gridScale][cell.c];
            o.push({ "c": c.c, "r": c.r, "d": connlibDir.B });
        }
        if (grid[cell.r] && grid[cell.r][cell.c - connlib.instance._gridScale] && grid[cell.r][cell.c - connlib.instance._gridScale].w == 1) {
            c = grid[cell.r][cell.c - connlib.instance._gridScale];
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
    /**
     * the method calculates the costs for the anchestors
     * @param {*} costs 
     * @param {*} currentNode 
     */
    static updateCostsAndGetAnchestors(costs, currentNode) {
        var cost = Infinity;
        var a = null;
        if (costs[(currentNode.r - connlib.instance._gridScale).toString()] && costs[(currentNode.r - connlib.instance._gridScale).toString()][currentNode.c.toString()]) {
            let oD = costs[(currentNode.r - connlib.instance._gridScale).toString()][currentNode.c.toString()].d;
            if (oD == currentNode.d) {
                if (costs[(currentNode.r - connlib.instance._gridScale).toString()][currentNode.c.toString()].cost < cost) {
                    cost = costs[(currentNode.r - connlib.instance._gridScale).toString()][currentNode.c.toString()].cost;
                    a = [...costs[(currentNode.r - connlib.instance._gridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r - connlib.instance._gridScale, c: currentNode.c, d: oD }];
                }
            } else {
                if ((costs[(currentNode.r - connlib.instance._gridScale).toString()][currentNode.c.toString()].cost + 1) < cost) {
                    cost = costs[(currentNode.r - connlib.instance._gridScale).toString()][currentNode.c.toString()].cost + 1;
                    a = [...costs[(currentNode.r - connlib.instance._gridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r - connlib.instance._gridScale, c: currentNode.c, d: oD }];
                }
            }
        }
        if (costs[currentNode.r.toString()] && costs[currentNode.r.toString()][(currentNode.c + connlib.instance._gridScale).toString()]) {
            let oD = costs[currentNode.r.toString()][(currentNode.c + connlib.instance._gridScale).toString()].d;
            if (oD == currentNode.d) {
                if (costs[currentNode.r.toString()][(currentNode.c + connlib.instance._gridScale).toString()].cost < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c + connlib.instance._gridScale).toString()].cost;
                    a = [...costs[currentNode.r.toString()][(currentNode.c + connlib.instance._gridScale).toString()].a, { r: currentNode.r, c: currentNode.c + connlib.instance._gridScale, d: oD }];
                }
            } else {
                if ((costs[currentNode.r.toString()][(currentNode.c + connlib.instance._gridScale).toString()].cost + 1) < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c + connlib.instance._gridScale).toString()].cost;
                    a = [...costs[currentNode.r.toString()][(currentNode.c + connlib.instance._gridScale).toString()].a, { r: currentNode.r, c: currentNode.c + connlib.instance._gridScale, d: oD }];
                }
            }
        }
        if (costs[(currentNode.r + connlib.instance._gridScale).toString()] && costs[(currentNode.r + connlib.instance._gridScale).toString()][currentNode.c.toString()]) {
            let oD = costs[(currentNode.r + connlib.instance._gridScale).toString()][currentNode.c.toString()].d;
            if (oD == currentNode.d) {
                if (costs[(currentNode.r + connlib.instance._gridScale).toString()][currentNode.c.toString()].cost < cost) {
                    cost = costs[(currentNode.r + connlib.instance._gridScale).toString()][currentNode.c.toString()].cost;
                    a = [...costs[(currentNode.r + connlib.instance._gridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r + connlib.instance._gridScale, c: currentNode.c, d: oD }];
                }
            } else {
                if ((costs[(currentNode.r + connlib.instance._gridScale).toString()][currentNode.c.toString()].cost + 1) < cost) {
                    cost = costs[(currentNode.r + connlib.instance._gridScale).toString()][currentNode.c.toString()].cost;
                    a = [...costs[(currentNode.r + connlib.instance._gridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r + connlib.instance._gridScale, c: currentNode.c, d: oD }];
                }
            }
        }
        if (costs[currentNode.r.toString()] && costs[currentNode.r.toString()][(currentNode.c - connlib.instance._gridScale).toString()]) {
            let oD = costs[currentNode.r.toString()][(currentNode.c - connlib.instance._gridScale).toString()].d;
            if (oD == currentNode.d) {
                if (costs[currentNode.r.toString()][(currentNode.c - connlib.instance._gridScale).toString()].cost < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c - connlib.instance._gridScale).toString()].cost;
                    a = [...costs[currentNode.r.toString()][(currentNode.c - connlib.instance._gridScale).toString()].a, { r: currentNode.r, c: currentNode.c - connlib.instance._gridScale, d: oD }];
                }
            } else {
                if ((costs[currentNode.r.toString()][(currentNode.c - connlib.instance._gridScale).toString()].cost + 1) < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c - connlib.instance._gridScale).toString()].cost;
                    a = costs[currentNode.r.toString()][(currentNode.c - connlib.instance._gridScale).toString()].a;
                    a = [...costs[currentNode.r.toString()][(currentNode.c - connlib.instance._gridScale).toString()].a, { r: currentNode.r, c: currentNode.c - connlib.instance._gridScale, d: oD }];
                }
            }
        }
        if (cost == Infinity) cost = 0;
        if (a == null) a = [];
        else a
        if (!costs[currentNode.r.toString()]) costs[currentNode.r.toString()] = {};
        costs[currentNode.r.toString()][currentNode.c.toString()] = { cost: cost, a: a, d: currentNode.d };
        return a;
    }
}

const connlibDir = {
    "T": 1,
    "R": 2,
    "B": 3,
    "L": 4
}