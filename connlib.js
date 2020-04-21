/**
 * the class contains a connlib renderable interface for 
 */
class connlibAbstractRenderable {

    guid;
    connlibInstance;

    constructor(connlibInstance) {
        this.connlibInstance = connlibInstance;
    }
}

class connlib {

    // connlib-block - default elements, whose should not be overlapping with edges (margin = 1 * grid size)
    // connlib-block-a-top, connlib-block-a-right, connlib-block-a-bottom, connlib-block-a-left
    // connlib-element - all elements within the connlib domain

    static instances = [];
    static moveX = 0; // x-transform property
    static moveY = 0; // y-transform property
    static gridScale = 10;
    static initialized = false;
    static invertMoveDirection = false;
    static gridPadding = 80; // the padding of the background grids

    guid;
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    _connections = [];
    _endpoints = [];
    _breakPoints = [];
    _renderGrid = false;
    _internalGrid;
    _lines = [];

    _moveStep = 20;
    _elementMargin = 10; // reserved margin around blocking elements

    _renderCellsWalkable = true;
    _renderCellsNotWalkable = true;
    _gridCellsRendered = false;

    container = null;

    // how far should the endpoints stand out?
    static _endpointStag = 20;
    // how big should the endpoints be?
    static _endpointSizeThk = 20;
    static _endpointSizeThn = 10;
    static dragFlag = null;
    static afterMouseMoveHanlders = [];

    /**
     * the constructor creates a new connlib instance within the passed parent
     * @param {*} parent node
     */
    constructor(parent) {
        this.container = parent;
        connlibExt.overprintGuid(this, "guid");
        this.svg.id = this.guid;
        this.svg.classList.add("background-grid");
        this.container.appendChild(this.svg);
        connlib.instances.push(this);
        this.updateGrid();
    }
    /**
     * the method applys the transform to all contents
     */
    static applyTransform() {
        document.getElementById("body").style.transform = "translate(" + this.moveX + "px, " + this.moveY + "px)";
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
     * the method removes all breakpoints from the dom
     */
    static clearAllBreakpoints(){
        let breakPoints = document.getElementsByClassName("breakpoint-marker");
        for(let b of breakPoints) b.parentNode.removeChild(b);
    }
    /**
     * the method enables user's to connect 2 dom elements and returns whether a connection can be established
     * @param {*} source dom identifier 
     * @param {*} target dom identifier
     */
    connect(source, target) {
        if (!connlib.initialized) {
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
            let conn = new connlibConnection(this, null, null);
            conn.connect(el1, el2);
        } else {
            console.log("connlib is currently only supporting to connect elements by there identifier");
            return false;
        }
    }
    /**
     * the method returns the instances parent container id
     */
    get containerId() {
        return this.container.id;
    }
    /**
     * the method adds a customn point to the current instance
     * @param {*} data 
     */
    customPoint(data){
        let p = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        p.setAttribute("cx", data.left);
        p.setAttribute("cy", data.top);
        p.setAttribute("r", data.radius);
        p.setAttribute("fill", data.color);
        if(Array.isArray(data.classes)) for(let c of data.classes) p.classList.add(c);
        this.svg.appendChild(p);
    }
    /**
     * the method returns a connlib instance by guid
     * @param {*} guid 
     */
    static findInstanceByGuid(guid) {
        return this._instances.find(x => x.guid == guid);
    }
    /**
     * the method returns the current instance's grid scale
     */
    get gridScale() {
        return connlib.gridScale;
    }
    /**
     * the method initializes the connlib library
     */
    static init() {
        this.applyTransform();
        window.addEventListener("keyup", (event) => {
            switch (event.keyCode) {
                case 37:
                    if (this.invertMoveDirection) this.instance._moveX -= this.instance._moveStep;
                    this.instance._moveX += this.instance._moveStep;
                    break;
                case 38:
                    if (this.invertMoveDirection) this.instance._moveY -= this.instance._moveStep;
                    this.instance._moveY += this.instance._moveStep;
                    break;
                case 39:
                    if (this.invertMoveDirection) this.instance._moveX += this.instance._moveStep;
                    this.instance._moveX -= this.instance._moveStep;
                    break;
                case 40:
                    if (this.invertMoveDirection) this.instance._moveY += this.instance._moveStep;
                    this.instance._moveY -= this.instance._moveStep;
                    break;
            }
            this.applyTransform();
        });
        window.addEventListener("mousedown", (event) => {
            if (this.dragFlag == null) {
                event.preventDefault();
                event.stopPropagation();
                this.dragFlag = new connlibPan(event.clientX, event.clientY, connlib.moveX, connlib.moveY);
            }
        });
        window.addEventListener("mousemove", (event) => {
            let c = connlibExt.cumulativeOffset(event.target);
            let corr = {left:event.offsetX+c.left,top:event.offsetY+c.top};
            if (!this.dragFlag) return;
            switch (this.dragFlag.constructor) {
                case connlibLine:
                    let i = connlibExt.cumulativeOffset(this.dragFlag.connlibInstance.svg);
                    switch (this.dragFlag.type) {
                        case connlibLine.lineType.HORIZONTAL:
                            this.dragFlag.source.setTop(corr.top-i.top);
                            this.dragFlag.target.setTop(corr.top-i.top);
                            break;
                        case connlibLine.lineType.VERTICAL:
                            this.dragFlag.source.setLeft(corr.left-i.left);
                            this.dragFlag.target.setLeft(corr.left-i.left);
                            break;
                    }
                    break;
                case connlibPan:
                    let t = this.dragFlag.calculateTransform(event.clientX, event.clientY);
                    connlib.moveX = t.x;
                    connlib.moveY = t.y;
                    connlib.applyTransform();
                    break;
            }
            for (let h of this.afterMouseMoveHanlders) h(event, h);
        });
        window.addEventListener("mouseup", () => {
            this.dragFlag = null;
        });
        this.initialized = true;
    }
    /**
     * the method sets a marks all breakpoints on the dom
     */
    static markAllBreakpoints(){
        this.clearAllBreakpoints();
        for(let i of this.instances){
            for(let b of i._breakPoints) b.mark();
        }
    }
    /**
     * the method melts two points, drops one of them and connects all connections of the removed with the leaved
     */
    static meltBreakPoints(source, target, direction) {
        var f = false;
        let ls = [];
        let ps = [];
        while (!f) {
            let l = source.lines.find(x => !ls.includes(x) && x.type == direction && x.target == source);
            if (!l) f = true;
            else {
                ls.push(l);
                ps.push(source);
                source = l.source;
            }
        }
        f = false;
        while (!f) {
            let l = target.lines.find(x => !ls.includes(x) && x.type == direction && x.source == target);
            if (!l) f = true;
            else {
                ls.push(l);
                ps.push(target);
                target = l.target;
            }
        }
        if (ls.includes(connlib.dragFlag)) {
            let n = connlib.dragFlag;
            for (let l of ls) {
                if (l != n) l.remove();
            }
            for (let p of ps) {
                p.remove();
            }
            n.replaceBreakPoints(source, target);
            return true;
        }
        return false;
    }
    /**
     * the method returns the given element's offset rectangle
     * @param {*} element 
     */
    static offset(element) {
        let o = { "top": null, "left": null, "height": null, "width": null };
        if (element) {
            var rect = element.getBoundingClientRect();
            o.top = rect.top + document.body.scrollTop;
            o.left = rect.left + document.body.scrollLeft;
        }
        return o;
    }
    /**
     * the method renders a point at the given position with the given color
     * @param {*} point 
     * @param {*} color 
     */
    point(point, color) {
        let p = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        p.setAttribute("cx", point.c);
        p.setAttribute("cy", point.r);
        p.setAttribute("r", 5);
        p.setAttribute("fill", color);
        this.svg.appendChild(p);
    }
    /**
     * the method renders a rectangle at the given position with the given color
     * @param {*} point 
     * @param {*} color 
     */
    rect(point, size, color) {
        let p = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        p.setAttribute("x", point.c);
        p.setAttribute("y", point.r);
        p.setAttribute("width", (size - 1));
        p.setAttribute("height", (size - 1));
        p.setAttribute("fill", color);
        p.classList.add("drawed-rect");
        this.svg.appendChild(p);
    }
    /**
     * the method renders the current connlib instance
     */
    render() {
        this.clear();
        for (let e of this._endpoints) e.render();
        for (let c of this._connections) {
            c.calculatePath();
            c.render();
        }
    }

    static subscribeAfterMouseMoveObserver(handler) {
        this.afterMouseMoveHanlders.push(handler);
    }

    toggleRenderBlockingCells() {
        if (!this._gridCellsRendered) {
            this._gridCellsRendered = true;
            let elements = document.getElementsByClassName("connlib-element");
            for (let element of elements) element.style.display = "none";
            for (let rI in this._internalGrid.cells) {
                for (let cI in this._internalGrid.cells[rI]) {
                    if (this._renderCellsWalkable && this._internalGrid.cells[rI][cI].w == 1) {
                        connlib.rect(this._internalGrid.cells[rI][cI], connlib.gridScale, "green");
                    } else if (this._renderCellsNotWalkable && this._internalGrid.cells[rI][cI].w == 0) {
                        connlib.rect(this._internalGrid.cells[rI][cI], connlib.gridScale, "orange");
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

    static unSubscribeAfterMouseMoveObserver(handler) {
        let i = this.afterMouseMoveHanlders.indexOf(handler);
        if (i > -1) this.afterMouseMoveHanlders.splice(i, 1);
    }
    /**
     * the method updates the background grid and marks cells as blocked
     */
    updateGrid() {
        let elements = this.container.querySelectorAll(".connlib-element");
        var left;
        var top;
        var height;
        var width;
        if (elements.length == 0) {
            left = 0;
            top = 0;
            width = this.container.offsetWidth;
            height = this.container.offsetHeight;
        } else {
            left = Math.min(...[...elements].map(x => x.offsetLeft)) - connlib.gridPadding;
            top = Math.min(...[...elements].map(x => x.offsetTop)) - connlib.gridPadding;
            width = Math.ceil(Math.max(...([...elements].map(x => (x.offsetLeft + x.offsetWidth)))) / this.gridScale) * this.gridScale + (2 * connlib.gridPadding);
            height = Math.ceil(Math.max(...[...elements].map(x => (x.offsetTop + x.offsetHeight))) / this.gridScale) * this.gridScale + (2 * connlib.gridPadding);
        }
        this.svg.style.top = top;
        this.svg.style.left = left;
        this.svg.style.width = width;
        this.svg.style.height = height;
        this._internalGrid = new connlibGrid(width, height, this.gridScale);
        let blocks = this.container.querySelectorAll(".connlib-block");
        for (let element of blocks) {
            let rect = connlibExt.offsetRect(element);
            let l = Math.round((rect.left - left) / this.gridScale) * this.gridScale;
            let r = Math.round((rect.right - left) / this.gridScale) * this.gridScale;
            let t = Math.round((rect.top - top) / this.gridScale) * this.gridScale;
            let b = Math.round((rect.bottom - top) / this.gridScale) * this.gridScale;
            for (var row = t; row <= b; row += this.gridScale) {
                for (var col = l; col <= r; col += this.gridScale) {
                    this._internalGrid.cells[row][col].w = 0;
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
    constructor(mouseX, mouseY, initialXTransform, initialYTransform) {
        this.mouseX = mouseX;
        this.mouseY = mouseY;
        this.initialXTransform = initialXTransform;
        this.initialYTransform = initialYTransform;
    }
    /**
     * the method returns the calculation
     * @param {*} point 
     */
    calculateTransform(x, y) {
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
    type = connlibConnection.connectionType.DOTTED;
    /**
     * the constructor creates a new instance of a connection
     */
    constructor(connlibInstance, guid, endpoints) {
        super(connlibInstance);
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
        connlibInstance._connections.push(this);
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
        for (let pI = this.pathPoints.length - 1; pI >= 0; pI--) {
            let p = this.pathPoints[pI];
            p.remove();
        }
        for (let lI = this.lines.length - 1; lI >= 0; lI--) {
            let l = this.lines[lI];
            l.remove();
        }
        if (this.isRendered()) this.clear();
        var direction;
        var dir;
        let e1 = this.endpoints[0];
        let e2 = this.endpoints[1];
        e1.calculateCGridE();
        e2.calculateCGridE();
        switch (e1.direction) {
            case connlibEdgeDirection.TOP:
                direction = connlibDir.T;
                dir = connlibLine.lineType.VERTICAL;
                break;
            case connlibEdgeDirection.RIGHT:
                direction = connlibDir.R;
                dir = connlibLine.lineType.HORIZONTAL;
                break;
            case connlibEdgeDirection.BOTTOM:
                direction = connlibDir.B;
                dir = connlibLine.lineType.VERTICAL;
                break;
            case connlibEdgeDirection.LEFT:
                direction = connlibDir.L;
                dir = connlibLine.lineType.HORIZONTAL;
                break;
        }
        this.pathPoints = connlibExt.IDAStar(this.connlibInstance, e1, e2, direction);
        /*
        if(e1.connGridE.c == e2.connGridE.c) {
            this.pathPoints = [e1.connGridE, e2.connGridE];
        } else {
            
        }
        */
        for (var i = 1; i < this.pathPoints.length; i++) {
            let s = this.pathPoints[i - 1];
            let t = this.pathPoints[i];
            let ps = [s, t];
            if (s.c == t.c) {
                dir = connlibLine.lineType.VERTICAL;
            } else if (s.r == t.r) {
                dir = connlibLine.lineType.HORIZONTAL;
            } else {
                var diff;
                if (dir == connlibLine.lineType.HORIZONTAL) {
                    diff = (t.c - s.c) / 2 + s.c;
                    ps = [s, new connlibBreakPoint(this.connlibInstance, { c: diff, r: s.r }), new connlibBreakPoint(this.connlibInstance, { c: diff, r: t.r }), t];
                } else if (dir == connlibLine.lineType.VERTICAL) {
                    diff = (t.r - s.r) / 2 + s.r;
                    ps = [s, new connlibBreakPoint(this.connlibInstance, { c: s.c, r: diff }), new connlibBreakPoint(this.connlibInstance, { c: t.c, r: diff }), t];
                } else throw ("error");
            }
            for (var pI = 1; pI < ps.length; pI++) {
                ps[pI - 1].connection = this;
                ps[pI].connection = this;
                let l = connlibLine.connect(this.connlibInstance, ps[pI - 1], ps[pI]);
                l.connection = this;
                this.lines.push(l);
            }
        }
    }
    /**
     * the method enables user's to connect two points
     * @param {*} source 
     * @param {*} target 
     */
    connect(source, target) {
        this.endpoints = [];
        let endpoints = connlibExt.calcEndpointPosition(this.connlibInstance, source, target);
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
    /**
     * the method sets the connection's type
     */
    setType(type) {
        this.type = type;
        if (this.isRendered()) for (let l of this.lines) l.render();
    }
    /**
     * the constant contains all available connection types
     */
    static connectionType = {
        "DEFAULT": 0,
        "DOTTED": 1,
        "DOUBLE": 2
    }
}
/**
 * the class contains a connlib line between two breakpoints
 */
class connlibLine extends connlibAbstractRenderable {
    hsvg;
    lsvg;
    msvg;
    type;
    connection;
    source;
    target;
    _rendered = false;
    _initial = 0;
    constructor(connlibInstance) {
        super(connlibInstance);
        connlibExt.overprintGuid(this, "guid");
        connlibInstance._lines.push(this);
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
    /**
     * the method connects two breakpoints
     */
    static connect(connlibInstance, s, t) {
        let output = new connlibLine(connlibInstance);
        output.source = s;
        output.target = t;
        s.lines.push(output);
        t.lines.push(output);
        output.lsvg = document.createElementNS("http://www.w3.org/2000/svg", "path");
        output.lsvg.style.stroke = "#373737";
        output.lsvg.style.strokeWidth = 1;
        output.msvg = document.createElementNS("http://www.w3.org/2000/svg", "path");
        output.msvg.style.stroke = "white";
        output.msvg.style.strokeWidth = 0;
        output.hsvg = document.createElementNS("http://www.w3.org/2000/svg", "path");
        output.hsvg.style.stroke = "transparent";
        output.hsvg.style.strokeWidth = 10;
        output.hsvg.style.zIndex = 5;
        output.updateType();
        output.lsvg.setAttribute("d", "M" + s.c + " " + s.r + " L" + t.c + " " + t.r);
        output.msvg.setAttribute("d", "M" + s.c + " " + s.r + " L" + t.c + " " + t.r);
        output.hsvg.setAttribute("d", "M" + s.c + " " + s.r + " L" + t.c + " " + t.r);
        s.subscribePositionChange((point, fun, dir) => output.updatePosition(dir));
        t.subscribePositionChange((point, fun, dir) => output.updatePosition(dir));
        return output;
    }
    /**
     * the method calculates the line's length
     */
    get length() {
        return connlibExt.eukDist(this.source, this.target);
    }
    /**
     * the constant contains all available line types
     */
    static lineType = { "HORIZONTAL": 1, "VERTICAL": 2 }
    /**
     * the method removes the instance from the current data model
     */
    remove() {
        let sI = this.source.lines.indexOf(this);
        if (sI > -1) this.source.lines.splice(sI, 1);
        let tI = this.target.lines.indexOf(this);
        if (tI > -1) this.target.lines.splice(tI, 1);
        let cI = this.connection.lines.indexOf(this);
        if (cI > -1) this.connection.lines.splice(cI, 1);
        let lI = this.connlibInstance._lines.indexOf(this);
        if (lI > -1) this.connlibInstance._lines.splice(lI, 1);
        if (connlib.dragFlag == this) connlib.dragFlag = null;
        this.clear();
    }
    /**
     * the method renders the current line
     */
    render() {
        this.updateConnectionType();
        this.connlibInstance.svg.appendChild(this.lsvg);
        this.connlibInstance.svg.appendChild(this.msvg);
        this.connlibInstance.svg.appendChild(this.hsvg);
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
        this.hsvg.addEventListener("dblclick", (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.log(this);
        });
        this._rendered = true;
    }
    /**
     * the method replaces a line's breakpoint p1 with another breakpoint p2
     */
    replaceBreakPoint(p1, p2) {
        if (this.source == p1) {
            this.source = p2;
            this.updatePosition();
        } else if (this.target == p1) {
            this.target = p2;
            this.updatePosition();
        } else {
            console.warn("something went wrong: the line is not connected to the given point");
        }
    }
    /**
     * the method replaces both breakpoints
     */
    replaceBreakPoints(source, target) {
        this.source = source;
        this.target = target;
        this.updateType();
        this.lsvg.setAttribute("d", "M" + this.source.c + " " + this.source.r + " L" + this.target.c + " " + this.target.r);
        this.hsvg.setAttribute("d", "M" + this.source.c + " " + this.source.r + " L" + this.target.c + " " + this.target.r);
        this.source.subscribePositionChange((point, fun, dir) => this.updatePosition(dir));
        this.target.subscribePositionChange((point, fun, dir) => this.updatePosition(dir));
    }
    /**
     * the method analysis the current line's type
     */
    updateType() {
        if (this.source.r == this.target.r) {
            this.hsvg.classList.add("connlib-connection-hor");
            this.hsvg.classList.remove("connlib-connection-ver");
            this.type = connlibLine.lineType.HORIZONTAL;
        }
        else if (this.source.c == this.target.c) {
            this.hsvg.classList.add("connlib-connection-ver");
            this.hsvg.classList.remove("connlib-connection-hor");
            this.type = connlibLine.lineType.VERTICAL;
        } else {
            console.warn("line with wrong points detected! GUID: " + this.guid);
        }
    }
    /**
     * the method updates the current instance's line type
     */
    updateConnectionType() {
        switch (this.connection.type) {
            case connlibConnection.connectionType.DEFAULT:
                this.lsvg.setAttribute("stroke-dasharray", "0");
                this.lsvg.style.strokeWidth = 1;
                this.msvg.style.strokeWidth = 0;
                break;
            case connlibConnection.connectionType.DOTTED:
                this.lsvg.setAttribute("stroke-dasharray", "2");
                this.lsvg.style.strokeWidth = 1;
                this.msvg.style.strokeWidth = 0;
                break;
            case connlibConnection.connectionType.DOUBLE:
                this.lsvg.setAttribute("stroke-dasharray", "0");
                this.lsvg.style.strokeWidth = 3;
                this.msvg.style.strokeWidth = 1;
                break;
        }
    }
    /**
     * the method updates the current line and drops it if necessary
     */
    updatePosition(direction) {
        if (this.length == 0 && direction) {
            var abort = true;
            this.remove();
            switch (direction) {
                case connlibLine.lineType.HORIZONTAL:
                    abort = connlib.meltBreakPoints(this.source, this.target, connlibLine.lineType.VERTICAL);
                    break;
                case connlibLine.lineType.VERTICAL:
                    abort = connlib.meltBreakPoints(this.source, this.target, connlibLine.lineType.HORIZONTAL);
                    break;
            }
            if (abort) return;
        }
        this.lsvg.setAttribute("d", "M" + this.source.c + " " + this.source.r + " L" + this.target.c + " " + this.target.r);
        this.msvg.setAttribute("d", "M" + this.source.c + " " + this.source.r + " L" + this.target.c + " " + this.target.r);
        this.hsvg.setAttribute("d", "M" + this.source.c + " " + this.source.r + " L" + this.target.c + " " + this.target.r);
    }
}
/**
 * the class contains an endpoint of a connectable element
 */
class connlibEndpoint extends connlibAbstractRenderable {
    source = null;
    connection = null;
    left = null;
    top = null;
    type = connlibEndpointType.PORT_FULFILLMENT;
    direction = null;
    a = null;  // rendered anchor point
    p = null;  // rendered, stagged anchor path
    b = null; // rendered, port
    _connGridE = null;
    _rendered = false;
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    /**
     * the position change event handlers
     */
    onPositionChangeHandlers = [];
    /**
     * the constructor creates a new endpoint
     */
    constructor(connlibInstance, source, connection, positioning) {
        super(connlibInstance);
        connlibExt.overprintGuid(this, "guid");
        this.svg.classList.add("endpoint-svg");
        this.svg.addEventListener("dblclick", () => console.log(this));
        if (source) this.source = source;
        if (connection) this.connection = connection;
        if (positioning) {
            this.left = positioning.left;
            this.top = positioning.top;
            this.direction = positioning.direction;
        }
        connlibInstance._endpoints.push(this);
        source.addEventListener("positionChange", (event) => {
            console.log("update ", this, event);
        });
    }
    /**
     *  the method returns the endpoint's connectable endpoint
     */
    get connGridE() {
        if (!this._connGridE) this.calculateCGridE();
        return this._connGridE;
    }
    /**
     * the method calculates the endpoint's connectable endpoint
     */
    calculateCGridE() {
        var corrL = Math.ceil((this.left - parseFloat(this.connlibInstance.svg.style.left)) / connlib.gridScale) * connlib.gridScale;
        var corrT = Math.ceil((this.top - parseFloat(this.connlibInstance.svg.style.top)) / connlib.gridScale) * connlib.gridScale;
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
        this._connGridE = this.connlibInstance._internalGrid.cells[parseInt(corrT)][parseInt(corrL)];
    }
    /**
     * the method calculates the endpoint element's endpoint from the connection point
     */
    calculateElementPointFromCGridE(point) {
        var corrL = point.c + parseFloat(this.connlibInstance.svg.style.left);
        var corrT = point.r + parseFloat(this.connlibInstance.svg.style.top);
        switch (this.direction) {
            case connlibEdgeDirection.TOP:
                corrT = point.r;
                break;
            case connlibEdgeDirection.BOTTOM:
                corrT -= connlib._endpointStag;
                break;
            case connlibEdgeDirection.LEFT:
            case connlibEdgeDirection.RIGHT:
                corrL -= connlib._endpointStag;
                break;
        }
        return { top: corrT, left: corrL };
    }
    /**
     * the method returns the endpoint's stagged line direction
     */
    get connlibLineDirection() {
        switch (this.direction) {
            case connlibEdgeDirection.TOP:
            case connlibEdgeDirection.BOTTOM:
                return connlibLine.lineType.VERTICAL;
            case connlibEdgeDirection.RIGHT:
            case connlibEdgeDirection.LEFT:
                return connlibLine.lineType.HORIZONTAL;
        }
        return null;
    }
    /**
     * the method removes the current enpoint from the dom
     */
    clear() {
        if (this.isRendered()) {
            this.svg.innerHTML = "";
            this.svg.parentNode.removeChild(this.svg);
        }
        this._rendered = false;
    }
    /**
     * the method returns the endpoint's grid point
     */
    get gridE() {
        var corrL = Math.ceil((this.left - parseFloat(this.svg.style.left)) / connlib.gridScale) * connlib.gridScale;
        var corrT = Math.ceil((this.top - parseFloat(this.svg.style.top)) / connlib.gridScale) * connlib.gridScale;
        return this.connlibInstance._internalGrid.cells[parseInt(corrT)][parseInt(corrL)];
    }
    /**
     * the method returns whether the current endpoint is rendered on the dom
     */
    isRendered() {
        return this._rendered;
    }
    /**
     * the method returns a reference break point
     */
    reference() {
        let p = new connlibBreakPoint(this.connlibInstance, this._connGridE);
        p._isEP = true;
        p.subscribeBeforePositionChange((newPos, abort) => {
            switch (this.direction) {
                case connlibEdgeDirection.TOP:
                    if (newPos.top > this._connGridE.r) abort.v = true;
                    break;
                case connlibEdgeDirection.RIGHT:
                    if (newPos.left < this._connGridE.c) abort.v = true;
                    break;
                case connlibEdgeDirection.BOTTOM:
                    if (newPos.top < this._connGridE.r) abort.v = true;
                    break;
                case connlibEdgeDirection.LEFT:
                    if (newPos.left > this._connGridE.c) abort.v = true;
                    break;
            }
        });
        p.subscribePositionChange((point, self) => {
            let r = this.calculateElementPointFromCGridE(point);
            switch (this.direction) {
                case connlibEdgeDirection.TOP:
                    this.left = r.left;
                    if (this.left < this.source.offsetLeft) {
                        connlib.subscribeAfterMouseMoveObserver((event, self) => {
                            this.direction = connlibEdgeDirection.LEFT;
                            this.setPosition({ left: this.source.offsetLeft, top: (this.source.offsetTop + connlib.gridScale) });
                            connlib.dragFlag = null;
                            connlib.unSubscribeAfterMouseMoveObserver(self);
                        });
                        return;
                    } else if (this.left > (this.source.offsetLeft + this.source.offsetWidth)) {
                        connlib.subscribeAfterMouseMoveObserver((event, self) => {
                            this.direction = connlibEdgeDirection.RIGHT;
                            this.setPosition({ left: (this.source.offsetLeft + this.source.offsetWidth), top: (this.source.offsetTop + connlib.gridScale) });
                            connlib.dragFlag = null;
                            connlib.unSubscribeAfterMouseMoveObserver(self);
                        });
                        return;
                    }
                    if (r.top < this._connGridE.r) {
                        point.unsubscribePositionChange(self);
                        let ref = this.reference();
                        ref.connection = point.connection;
                        let l = connlibLine.connect(this.connlibInstance, point, ref);
                        l.connection = point.connection;
                        l.connection.lines.push(l);
                        l.render();
                    }
                    break;
                case connlibEdgeDirection.RIGHT:
                    this.top = r.top;
                    if (this.top < this.source.offsetTop) {
                        connlib.subscribeAfterMouseMoveObserver((event, self) => {
                            this.direction = connlibEdgeDirection.TOP;
                            this.setPosition({ left: (this.source.offsetLeft + this.source.offsetWidth - connlib.gridScale), top: this.source.offsetTop });
                            connlib.dragFlag = null;
                            connlib.unSubscribeAfterMouseMoveObserver(self);
                        });
                        return;
                    } else if (this.top > (this.source.offsetTop + this.source.offsetHeight)) {
                        connlib.subscribeAfterMouseMoveObserver((event, self) => {
                            this.direction = connlibEdgeDirection.BOTTOM;
                            this.setPosition({ left: (this.source.offsetLeft + this.source.offsetWidth - connlib.gridScale), top: (this.source.offsetTop + this.source.offsetHeight) });
                            connlib.dragFlag = null;
                            connlib.unSubscribeAfterMouseMoveObserver(self);
                        });
                        return;
                    }
                    if (r.left > this._connGridE.c) {
                        point.unsubscribePositionChange(self);
                        let ref = this.reference();
                        ref.connection = point.connection;
                        let l = connlibLine.connect(this.connlibInstance, point, ref);
                        l.connection = point.connection;
                        l.connection.lines.push(l);
                        l.render();
                    }
                    break;
                case connlibEdgeDirection.BOTTOM:
                    this.left = r.left;
                    if (this.left < this.source.offsetLeft) {
                        connlib.subscribeAfterMouseMoveObserver((event, self) => {
                            this.direction = connlibEdgeDirection.LEFT;
                            this.setPosition({ left: this.source.offsetLeft, top: (this.source.offsetTop + this.source.offsetHeight - connlib.gridScale) });
                            connlib.dragFlag = null;
                            connlib.unSubscribeAfterMouseMoveObserver(self);
                        });
                        return;
                    } else if (this.left > (this.source.offsetLeft + this.source.offsetWidth)) {
                        connlib.subscribeAfterMouseMoveObserver((event, self) => {
                            this.direction = connlibEdgeDirection.RIGHT;
                            this.setPosition({ left: (this.source.offsetLeft + this.source.offsetWidth), top: (this.source.offsetTop + this.source.offsetHeight - connlib.gridScale) });
                            connlib.dragFlag = null;
                            connlib.unSubscribeAfterMouseMoveObserver(self);
                        });
                        return;
                    }
                    if (r.top > this._connGridE.r) {
                        point.unsubscribePositionChange(self);
                        let ref = this.reference();
                        ref.connection = point.connection;
                        let l = connlibLine.connect(this.connlibInstance, point, ref);
                        l.connection = point.connection;
                        l.connection.lines.push(l);
                        l.render();
                    }
                    break;
                case connlibEdgeDirection.LEFT:
                    this.top = r.top;
                    if (this.top < this.source.offsetTop) {
                        connlib.subscribeAfterMouseMoveObserver((event, self) => {
                            this.direction = connlibEdgeDirection.TOP;
                            this.setPosition({ left: (this.source.offsetLeft + connlib.gridScale), top: this.source.offsetTop });
                            connlib.dragFlag = null;
                            connlib.unSubscribeAfterMouseMoveObserver(self);
                        });
                    } else if (this.top > (this.source.offsetTop + this.source.offsetHeight)) {
                        connlib.subscribeAfterMouseMoveObserver((event, self) => {
                            this.direction = connlibEdgeDirection.BOTTOM;
                            this.setPosition({ left: (this.source.offsetLeft + connlib.gridScale), top: (this.source.offsetTop + this.source.offsetHeight) });
                            connlib.dragFlag = null;
                            connlib.unSubscribeAfterMouseMoveObserver(self);
                        });
                        return;
                    }
                    if (r.left < this._connGridE.c) {
                        point.unsubscribePositionChange(self);
                        let ref = this.reference();
                        ref.connection = point.connection;
                        let l = connlibLine.connect(this.connlibInstance, point, ref);
                        l.connection = point.connection;
                        l.connection.lines.push(l);
                        l.render();
                    }
                    break;
            }
            this.render();
        });
        return p;
    }
    /**
     * the method renders the current endpoint
     */
    render() {
        if (this.isRendered()) this.clear();
        this.p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.p.style.stroke = "#373737";
        this.p.style.strokeWidth = 1;
        let thkH = connlib._endpointSizeThk / 2;
        var c = null; // pointer center
        var f1 = null; // footer point 1
        var f2 = null; // footer point 2
        var pb = null; // port base point
        switch (this.direction) {
            case connlibEdgeDirection.TOP:
                this.svg.style.left = this.left - (connlib._endpointSizeThk / 2) + 1 + this.connlibInstance.container.offsetLeft;
                this.svg.style.top = this.top - connlib._endpointStag +  this.connlibInstance.container.offsetTop;
                this.svg.style.height = connlib._endpointSizeThn + connlib._endpointStag;
                this.svg.style.width = connlib._endpointSizeThk;
                this.svg.classList.add("connlib-estag-ver");
                this.p.setAttribute("d", "M" + thkH + " " + connlib._endpointStag + " L" + thkH + " 0");
                c = { x: thkH, y: (connlib._endpointStag) };
                f1 = { x: 5, y: (connlib._endpointStag - connlib._endpointSizeThn) };
                f2 = { x: (connlib._endpointSizeThk - 5), y: (connlib._endpointStag - connlib._endpointSizeThn) };
                pb = { x: f1.x, y: (c.y - (connlib._endpointSizeThn / 2)) };
                break;
            case connlibEdgeDirection.RIGHT:
                this.svg.style.left = this.left - connlib._endpointSizeThn + 1 + this.connlibInstance.container.offsetLeft;
                this.svg.style.top = this.top - (connlib._endpointSizeThk / 2) + 1 +  this.connlibInstance.container.offsetTop;
                this.svg.style.height = connlib._endpointSizeThk;
                this.svg.style.width = connlib._endpointSizeThn + connlib._endpointStag;
                this.svg.classList.add("connlib-estag-hor");
                this.p.setAttribute("d", "M" + connlib._endpointSizeThn + " " + thkH + " L" + (connlib._endpointStag + connlib._endpointSizeThn) + " " + thkH);
                c = { x: connlib._endpointSizeThn, y: thkH };
                f1 = { x: (connlib._endpointSizeThn * 2), y: 5 };
                f2 = { x: (connlib._endpointSizeThn * 2), y: (connlib._endpointSizeThk - 5) };
                pb = { x: (c.x - (connlib._endpointSizeThn / 2)), y: f1.y };
                break;
            case connlibEdgeDirection.BOTTOM:
                this.svg.style.left = this.left - (connlib._endpointSizeThk / 2) + 1 +  this.connlibInstance.container.offsetLeft;
                this.svg.style.top = this.top - (connlib._endpointSizeThn) + 1 +  this.connlibInstance.container.offsetTop;
                this.svg.style.height = connlib._endpointSizeThn + connlib._endpointStag;
                this.svg.style.width = connlib._endpointSizeThk;
                this.svg.classList.add("connlib-estag-ver");
                this.p.setAttribute("d", "M" + thkH + " " + connlib._endpointSizeThn + " L" + thkH + " " + (connlib._endpointStag + connlib._endpointSizeThn));
                c = { x: thkH, y: connlib._endpointSizeThn };
                f1 = { x: 5, y: (connlib._endpointSizeThn * 2) };
                f2 = { x: (connlib._endpointSizeThk - 5), y: (connlib._endpointSizeThn * 2) };
                pb = { x: f1.x, y: (c.y - (connlib._endpointSizeThn / 2)) };
                break;
            case connlibEdgeDirection.LEFT:
                this.svg.style.left = this.left - connlib._endpointStag + this.connlibInstance.container.offsetLeft;
                this.svg.style.top = this.top - (connlib._endpointSizeThk / 2) + 1 +  this.connlibInstance.container.offsetTop;
                this.svg.style.height = connlib._endpointSizeThk;
                this.svg.style.width = connlib._endpointSizeThn + connlib._endpointStag;
                this.svg.classList.add("connlib-estag-hor");
                this.p.setAttribute("d", "M0 " + thkH + " L" + (connlib._endpointStag - 1) + " " + thkH);
                c = { x: connlib._endpointStag, y: thkH };
                f1 = { x: (connlib._endpointStag - connlib._endpointSizeThn), y: 5 };
                f2 = { x: (connlib._endpointStag - connlib._endpointSizeThn), y: (connlib._endpointSizeThk - 5) };
                pb = { x: (c.x - (connlib._endpointSizeThn / 2)), y: f1.y };
                break;
        }
        this.svg.appendChild(this.p);
        switch (this.type) {
            case connlibEndpointType.ARROW:
                if (c && f1 && f2) {
                    this.a = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    this.a.style.fill = "#373737";
                    this.a.style.strokeWidth = 1;
                    this.a.setAttribute("points", c.x + "," + c.y + " " + f1.x + "," + f1.y + " " + f2.x + "," + f2.y);
                    this.svg.appendChild(this.a);
                    this.b = null;
                }
                break;
            case connlibEndpointType.INHERITANCE:
                if (c && f1 && f2) {
                    this.a = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    this.a.style.fill = "#ffffff";
                    this.a.style.stroke = "#373737";
                    this.a.style.strokeWidth = 1;
                    this.a.setAttribute("points", c.x + "," + c.y + " " + f1.x + "," + f1.y + " " + f2.x + "," + f2.y);
                    this.svg.appendChild(this.a);
                    this.b = null;
                }
                break;
            case connlibEndpointType.PORT:
                if (c && f1 && f2) {
                    this.b = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    this.b.style.fill = "#ffffff";
                    this.b.style.stroke = "#373737";
                    this.b.style.strokeWidth = 1;
                    this.b.setAttribute("x", pb.x);
                    this.b.setAttribute("y", pb.y);
                    this.b.setAttribute("height", connlib._endpointSizeThn);
                    this.b.setAttribute("width", connlib._endpointSizeThn);
                    this.a = null;
                    this.svg.appendChild(this.b);
                }
                break;
            case connlibEndpointType.PORT_FULFILLMENT:
                if (c && f1 && f2) {
                    this.b = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    this.b.style.fill = "#ffffff";
                    this.b.style.stroke = "#373737";
                    this.b.style.strokeWidth = 1;
                    this.b.setAttribute("x", pb.x);
                    this.b.setAttribute("y", pb.y);
                    this.b.setAttribute("height", connlib._endpointSizeThn);
                    this.b.setAttribute("width", connlib._endpointSizeThn);
                    this.svg.appendChild(this.b);
                    this.a = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    this.a.style.fill = "#373737";
                    this.a.style.strokeWidth = 1;
                    this.a.setAttribute("points", c.x + "," + c.y + " " + f1.x + "," + f1.y + " " + f2.x + "," + f2.y);
                    this.svg.appendChild(this.a);
                }
                break;
        }
        document.getElementById("body").appendChild(this.svg);
        this._rendered = true;
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
        for (let e of this.onPositionChangeHandlers) e(this, e, connlibLine.lineType.HORIZONTAL);
    }
    /**
     * the method updates the current position
     */
    setPosition(position) {
        this.left = position.left;
        this.top = position.top;
        this.calculateCGridE();
        if (this.isRendered()) {
            this.render();
            this.connection.calculatePath();
            this.connection.render();
        }
        for (let e of this.onPositionChangeHandlers) e(this, e, null);
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
        for (let e of this.onPositionChangeHandlers) e(this, e, connlibLine.lineType.VERTICAL);
    }
    /**
     * the method sets the endpoint type
     */
    setType(type) {
        this.type = type;
        if (this.isRendered()) {
            this.render();
        }
    }
    /**
     * the method registers a handler that is fired on position changed 
     */
    subscribePositionChange(handler) {
        this.onPositionChangeHandlers.push(handler);
    }
    /**
     * the method unregisters a handler on position changed
     */
    unsubscribePositionChange(fun) {
        let i = this.onPositionChangeHandlers.indexOf(fun);
        if (i > -1) {
            this.onPositionChangeHandlers.splice(i, 1);
        } else {
            console.warn("cannot unsubscribe function");
        }
    }
}

class connlibBreakPoint extends connlibAbstractRenderable {

    connection = null;
    lines = [];
    c = null;
    r = null;

    beforePositionChangeHandlers = [];
    onPositionChangeHandlers = [];

    _isEP = false;

    constructor(connlibInstance, object) {
        super(connlibInstance);
        connlibExt.overprintGuid(this, "guid");
        connlibInstance._breakPoints.push(this);
        this.c = object.c;
        this.r = object.r;
    }
    /**
     * the method returns the left coordinate of the point
     */
    get left() {
        return this.c;
    }
    /**
     * the method marks the current endpoint on the connlib instance
     */
    mark(){
        let color = "orange";
        if(this._isEP){
            color = "red";
        }
        this.connlibInstance.customPoint({left:this.c,top:this.r,color:color,radius:"2",classes:["breakpoint-marker"]});
    }
    /**
     * the method removes a breakpoint from the current data model
     */
    remove() {
        let cI = this.connection.pathPoints.indexOf(this);
        if (cI > -1) this.connection.pathPoints.splice(cI, 1);
        let i = this.connlibInstance._breakPoints.indexOf(this);
        if (i > -1) this.connlibInstance._breakPoints.splice(i, 1);
    }
    /**
     * the method updates the endpoint's left coordinate
     */
    setLeft(left) {
        var abort = { v: false };
        for (let e of this.beforePositionChangeHandlers) e({ top: this.r, left: left }, abort);
        if (abort.v) {
            console.log("aborted");
            return false;
        }
        this.c = left;
        for (let e of this.onPositionChangeHandlers) e(this, e, connlibLine.lineType.HORIZONTAL);
        return true;
    }
    /**
     * the method updates the endpoint's top coordinate
     */
    setTop(top) {
        var abort = { v: false };
        for (let e of this.beforePositionChangeHandlers) e({ top: top, left: this.c }, abort);
        if (abort.v) {
            console.log("aborted");
            return false;
        }
        this.r = top;
        for (let e of this.onPositionChangeHandlers) e(this, e, connlibLine.lineType.VERTICAL);
        return true;
    }
    /**
    * the method subscribes a before position change handler
    */
    subscribeBeforePositionChange(handler) {
        this.beforePositionChangeHandlers.push(handler);
    }
    /**
     * the method subscribes a position change handler
     */
    subscribePositionChange(handler) {
        this.onPositionChangeHandlers.push(handler);
    }
    /**
     * the method returns the top coordinate of the point
     */
    get top() {
        return this.r;
    }

    unsubscribePositionChange(fun) {
        let i = this.onPositionChangeHandlers.indexOf(fun);
        if (i > -1) {
            this.onPositionChangeHandlers.splice(i, 1);
        } else {
            console.warn("cannot unsubscribe function");
        }
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
    "ARROW": 1,
    "INHERITANCE": 2,
    "PORT": 3
}

const connlibEdgeDirection = {
    "TOP": 0,
    "RIGHT": 1,
    "BOTTOM": 2,
    "LEFT": 3
}

class connlibExt {

    static guidMap = {};

    static calcEndpointPosition(connlibInstance, element1, element2) {

        let mEl1 = this.calcMiddle(element1);
        let mEl2 = this.calcMiddle(element2);
        if(mEl1.left == mEl2.left){
            var t1;
            var t2;
            var d1;
            var d2;
            if(mEl1.top < mEl2.top){
                t1 = element1.offsetTop + element1.offsetHeight;
                t2 = element2.offsetTop;
                d1 = connlibEdgeDirection.BOTTOM;
                d2 = connlibEdgeDirection.TOP;
            } else {
                t1 = element1.offsetTop;
                t2 = element2.offsetTop + element2.offsetHeight;
                d1 = connlibEdgeDirection.TOP;
                d2 = connlibEdgeDirection.BOTTOM;
            }
            return [new connlibEndpoint(connlibInstance, element1, null, {
                "parallely": false,
                "identical": false,
                "left": mEl1.left,
                "top": t1,
                "direction": d1
            }), new connlibEndpoint(connlibInstance, element2, null, {
                "parallely": false,
                "identical": false,
                "left": mEl2.left,
                "top": t2,
                "direction": d2
            })];
        }
        var element1Endpoint = null;
        var element2Endpoint = null;
        let fun = this.calcFunForTwoPoints(mEl1, mEl2);

        var p1 = {
            "top": mEl1.rect.top,
            "left": mEl1.rect.left
        };
        var p2 = {
            "top": mEl1.rect.top,
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
            "top": mEl1.rect.top,
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
            "left": mEl1.rect.left
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
            "left": mEl1.rect.left
        };
        p2 = {
            "top": mEl1.rect.top,
            "left": mEl1.rect.left
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
            "top": mEl2.rect.top,
            "left": mEl2.rect.left
        };
        p2 = {
            "top": mEl2.rect.top,
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
            "top": mEl2.rect.top,
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
            "left": mEl2.rect.left
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
            "left": mEl2.rect.left
        };
        p2 = {
            "top": mEl2.rect.top,
            "left": mEl2.rect.left
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

        element1Endpoint.left = Math.round(element1Endpoint.left / connlib.gridScale) * connlib.gridScale;
        element1Endpoint.top = Math.round(element1Endpoint.top / connlib.gridScale) * connlib.gridScale;
        element2Endpoint.left = Math.round(element2Endpoint.left / connlib.gridScale) * connlib.gridScale;
        element2Endpoint.top = Math.round(element2Endpoint.top / connlib.gridScale) * connlib.gridScale;

        return [new connlibEndpoint(connlibInstance, element1, null, element1Endpoint), new connlibEndpoint(connlibInstance, element2, null, element2Endpoint)];
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
    /**
     * the method calculates the element's middle
     * @param {*} element 
     */
    static calcMiddle(element) {
        let d = this.offsetRect(element);
        return { "left": d.left + (d.width / 2), "top": d.top + (d.height / 2), "rect": d };
    }
    /**
     * the method returns the element's cumultative offset
     * @param {*} element 
     */
    static cumulativeOffset(element) {
        var top = 0, left = 0;
        var last = element;
        do {
            if(element.tagName == "svg"){
                top += parseFloat(element.style.top) || 0;
                left += parseFloat(element.style.left) || 0;
                last = element;
                element = element.parentNode;
            } else {
                top += element.offsetTop  || 0;
                left += element.offsetLeft || 0;
                last = element;
                element = element.parentNode;
            }
        } while(element);
        return {
            top: top,
            left: left
        };
    };
    /**
     * the method calculates the euclydean distance between two points
     * @param {*} p1 
     * @param {*} p2 
     */
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
    static IDAStar(connlibInstance, e1, e2, direction) {
        let source = e1.connGridE;
        let target = e2.connGridE;
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
                console.log(stack, connlibInstance, e1, e2, direction);
                throw ("maximum number of loops reached!");
            }
            let frontier = this.surroundingManhattenMinimumCells(connlibInstance, s, target);
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
                        if (path[pI].c == source.c && path[pI].r == source.r) {
                            breakPoints.push(e1.reference());
                        } else if (pI == 0) {
                            breakPoints.push(new connlibBreakPoint(connlibInstance, path[pI]));
                        } else {
                            if (path[pI - 1].d != path[pI].d) breakPoints.push(new connlibBreakPoint(connlibInstance, path[pI - 1]));
                        }
                    }
                    breakPoints.push(e2.reference());
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
                if (i2 > max) {
                    console.log(threshold, connlibInstance, e1, e2, direction);
                    throw ("infinity loop");
                }
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
     * the method returns the 
     * @param {*} source centered cell
     * @param {*} target connection's target for manhatten distance
     */
    static surroundingManhattenMinimumCells(connlibInstance, source, target) {
        let s = this.surroundingCellsNoDiag(connlibInstance, source);
        return s.map(x => {
            return { "d": this.manhattenDistance(x, target), "o": x }
        });
    }
    /**
     * the method returns all grid cells that sourrounds the centered cell
     * the result contains a direction
     * @param {*} cell center
     */
    static surroundingCellsNoDiag(connlibInstance, cell) {
        var o = [];
        let grid = connlibInstance._internalGrid.cells;
        var c;
        if (grid[cell.r - connlib.gridScale] && grid[cell.r - connlib.gridScale][cell.c] && grid[cell.r - connlib.gridScale][cell.c].w == 1) {
            c = grid[cell.r - connlib.gridScale][cell.c];
            o.push({ "c": c.c, "r": c.r, "d": connlibDir.T });
        }
        if (grid[cell.r] && grid[cell.r][cell.c + connlib.gridScale] && grid[cell.r][cell.c + connlib.gridScale].w == 1) {
            c = grid[cell.r][cell.c + connlib.gridScale];
            o.push({ "c": c.c, "r": c.r, "d": connlibDir.R });
        }
        if (grid[cell.r + connlib.gridScale] && grid[cell.r + connlib.gridScale][cell.c] && grid[cell.r + connlib.gridScale][cell.c].w == 1) {
            c = grid[cell.r + connlib.gridScale][cell.c];
            o.push({ "c": c.c, "r": c.r, "d": connlibDir.B });
        }
        if (grid[cell.r] && grid[cell.r][cell.c - connlib.gridScale] && grid[cell.r][cell.c - connlib.gridScale].w == 1) {
            c = grid[cell.r][cell.c - connlib.gridScale];
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
     * the method returns the element's offset rectangle
     * @param {*} element 
     */
    static offsetRect(element) {
        return {
            top: element.offsetTop,
            left: element.offsetLeft,
            height: element.offsetHeight,
            width: element.offsetWidth,
            right: element.offsetLeft + element.offsetWidth,
            bottom: element.offsetTop + element.offsetHeight
        };
    }
    /**
     * the method calculates the costs for the anchestors
     * @param {*} costs 
     * @param {*} currentNode 
     */
    static updateCostsAndGetAnchestors(costs, currentNode) {
        var cost = Infinity;
        var a = null;
        if (costs[(currentNode.r - connlib.gridScale).toString()] && costs[(currentNode.r - connlib.gridScale).toString()][currentNode.c.toString()]) {
            let oD = costs[(currentNode.r - connlib.gridScale).toString()][currentNode.c.toString()].d;
            if (oD == currentNode.d) {
                if (costs[(currentNode.r - connlib.gridScale).toString()][currentNode.c.toString()].cost < cost) {
                    cost = costs[(currentNode.r - connlib.gridScale).toString()][currentNode.c.toString()].cost;
                    a = [...costs[(currentNode.r - connlib.gridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r - connlib.gridScale, c: currentNode.c, d: oD }];
                }
            } else {
                if ((costs[(currentNode.r - connlib.gridScale).toString()][currentNode.c.toString()].cost + 1) < cost) {
                    cost = costs[(currentNode.r - connlib.gridScale).toString()][currentNode.c.toString()].cost + 1;
                    a = [...costs[(currentNode.r - connlib.gridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r - connlib.gridScale, c: currentNode.c, d: oD }];
                }
            }
        }
        if (costs[currentNode.r.toString()] && costs[currentNode.r.toString()][(currentNode.c + connlib.gridScale).toString()]) {
            let oD = costs[currentNode.r.toString()][(currentNode.c + connlib.gridScale).toString()].d;
            if (oD == currentNode.d) {
                if (costs[currentNode.r.toString()][(currentNode.c + connlib.gridScale).toString()].cost < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c + connlib.gridScale).toString()].cost;
                    a = [...costs[currentNode.r.toString()][(currentNode.c + connlib.gridScale).toString()].a, { r: currentNode.r, c: currentNode.c + connlib.gridScale, d: oD }];
                }
            } else {
                if ((costs[currentNode.r.toString()][(currentNode.c + connlib.gridScale).toString()].cost + 1) < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c + connlib.gridScale).toString()].cost;
                    a = [...costs[currentNode.r.toString()][(currentNode.c + connlib.gridScale).toString()].a, { r: currentNode.r, c: currentNode.c + connlib.gridScale, d: oD }];
                }
            }
        }
        if (costs[(currentNode.r + connlib.gridScale).toString()] && costs[(currentNode.r + connlib.gridScale).toString()][currentNode.c.toString()]) {
            let oD = costs[(currentNode.r + connlib.gridScale).toString()][currentNode.c.toString()].d;
            if (oD == currentNode.d) {
                if (costs[(currentNode.r + connlib.gridScale).toString()][currentNode.c.toString()].cost < cost) {
                    cost = costs[(currentNode.r + connlib.gridScale).toString()][currentNode.c.toString()].cost;
                    a = [...costs[(currentNode.r + connlib.gridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r + connlib.gridScale, c: currentNode.c, d: oD }];
                }
            } else {
                if ((costs[(currentNode.r + connlib.gridScale).toString()][currentNode.c.toString()].cost + 1) < cost) {
                    cost = costs[(currentNode.r + connlib.gridScale).toString()][currentNode.c.toString()].cost;
                    a = [...costs[(currentNode.r + connlib.gridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r + connlib.gridScale, c: currentNode.c, d: oD }];
                }
            }
        }
        if (costs[currentNode.r.toString()] && costs[currentNode.r.toString()][(currentNode.c - connlib.gridScale).toString()]) {
            let oD = costs[currentNode.r.toString()][(currentNode.c - connlib.gridScale).toString()].d;
            if (oD == currentNode.d) {
                if (costs[currentNode.r.toString()][(currentNode.c - connlib.gridScale).toString()].cost < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c - connlib.gridScale).toString()].cost;
                    a = [...costs[currentNode.r.toString()][(currentNode.c - connlib.gridScale).toString()].a, { r: currentNode.r, c: currentNode.c - connlib.gridScale, d: oD }];
                }
            } else {
                if ((costs[currentNode.r.toString()][(currentNode.c - connlib.gridScale).toString()].cost + 1) < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c - connlib.gridScale).toString()].cost;
                    a = costs[currentNode.r.toString()][(currentNode.c - connlib.gridScale).toString()].a;
                    a = [...costs[currentNode.r.toString()][(currentNode.c - connlib.gridScale).toString()].a, { r: currentNode.r, c: currentNode.c - connlib.gridScale, d: oD }];
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