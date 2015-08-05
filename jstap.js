/**
 * jstap
 *
 * Complete rewrite of the jester API for iOS and Android
 *
 * Almost compatible with original jester code.
 *
 * jstap supports basic touches and complex multi-finger gestures,
 * including pinch, flick, swipe, grab etc.
 */

/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

(function (w) {
    var startTouches,
        prevTouches,
        totalTouches,
        deltaTouches,
        deltaScale,
        totalScale,
        startScale,
        prevScale,
        endTime,
        targetElement,
        jstapTouches,
        eTapTarget;

    var lastTouches = 0,
        monitoring = 0,
        lasttap = 0,
        lasttwintap = 0,
        anDroid = false;


    if(!w.CustomEvent) {
        // work around for old android versions!
        w.CustomEvent = function CustomEvent(ename, opts) {
            var event = document.createEvent('Event');
            event.initEvent(ename, opts.bubbles, opts.cancelable); // can bubble and is cancable
            return event;
        };
    }

    // callback map is used for finding proxy callbacks
    var callbackMap = [];

    // configuration options with default values
    var opts = {
            avoidDoubleTap: false,
            getAllTaps:     false,
            tapDistance:    10,
            tapTime:        100, // miliseconds
            tapLongTime:    1000,// miliseconds
            doubleTapTime:  400, // miliseconds

            avoidSwipe:     false,
            swipeDistance:  100,

            avoidFlick:     false,
            flickTime:      100,
            flickDistance:  50
    };

    function initJstap() {
        if(!lastTouches) {
            prevTouches  = [];
            startTouches = [];
            deltaTouches = [];
            totalTouches = [];

            startScale = 0;
            prevScale = 0;
            deltaScale = 1.0;
            totalScale = 1.0;
            endTime = null;
            targetElement = null;
            jstapTouches.touch(0); // reset the index!
        }
    }

    /**
     * ATTENTION: sizeCalc is not properly calculating the size causing
     * pinch and stretch gestures to be wrongly detected in some cases.
     *
     * This misbehaviour is because size calc uses a bounding box
     * for calculating the size of the touch area.
     */
    function sizeCalc(touchList)  {
        var i, size = 0, minX, minY, maxX, maxY;

        // estimate the convex hull for the finger positions.
        if ( touchList && touchList.length > 1 ) {
            minX = touchList[0].screenX;
            maxX = touchList[0].screenX;
            minY = touchList[0].screenY;
            maxY = touchList[0].screenY;
            for (i = 0; i < touchList.length; i++) {
                if (touchList[i].screenX < minX) {
                    minX = touchList[i].screenX;
                }
                if (touchList[i].screenY < minY) {
                    minY = touchList[i].screenY;
                }
                if (touchList[i].screenX > maxX) {
                    maxX = touchList[i].screenX;
                }
                if (touchList[i].screenY > maxY) {
                    maxY = touchList[i].screenY;
                }
            }
            size = (maxY-minY) * (maxX-minX);
        }
        return size;
    }

    function updateTouches(ptouches) {
        var i, t, ts;
        for (i = 0; i < ptouches.length; i++) {
            t = {identifier: ptouches[i].identifier,
                 screenX: ptouches[i].screenX,
                 screenY: ptouches[i].screenY,
                 clientX: ptouches[i].clientX,
                 clientY: ptouches[i].clientY};

            totalTouches[i].screenX = t.screenX - startTouches[i].screenX;
            totalTouches[i].screenY = t.screenY - startTouches[i].screenY;
            totalTouches[i].clientX = t.clientX - startTouches[i].clientX;
            totalTouches[i].clientY = t.clientY - startTouches[i].clientY;

            deltaTouches[i].screenX = t.screenX - prevTouches[i].screenX;
            deltaTouches[i].screenY = t.screenY - prevTouches[i].screenY;
            deltaTouches[i].clientX = t.clientX - prevTouches[i].clientX;
            deltaTouches[i].clienyY = t.clientY - prevTouches[i].clientY;

            prevTouches[i] = t;
        }

        ts = sizeCalc(ptouches);
        if (ts > 0) {
            if (startScale > 0) {
                totalScale = ts / startScale;
            }
            if (prevScale > 0) {
                deltaScale = ts / prevScale;
            }
        }

        prevScale = ts;

        lastTouches = ptouches.length;
    }

    function addTouch(evt) {
        var i, j, t, a, id;

        initJstap();

        if (!lastTouches) {
            targetElement = evt.touches[0].target || evt.target;
        }

        var newStart = [],
            newTotal = [],
            newPrev = [],
            newDelta = [];

        // add each touch in evt.touches that is not in startTouches to startTouches
        for (i = 0; i < evt.touches.length; i++) {
            a = true;
            id = evt.touches[i].identifier;
            for (j = 0; j < startTouches.length; j++) {
                if (startTouches[j].identifier === id) { // found exisiting touch
                    a = false;

                    newStart.push(startTouches[j]);
                    newTotal.push(totalTouches[j]);
                    newPrev.push(prevTouches[j]);
                    newDelta.push(deltaTouches[j]);
                    break;
                }
            }
            if (a) {
                t = {identifier: id,
                         screenX: evt.touches[i].screenX,
                         screenY: evt.touches[i].screenY,
                         clientX: evt.touches[i].clientX,
                         clientY: evt.touches[i].clientY,
                         startTime: new Date().getTime()};

                newStart.push(t);
                newPrev.push(t);
                newDelta.push({identifier: id,
                         screenX: 0,
                         screenY: 0,
                         clientX: 0,
                         clientY: 0});
                newTotal.push({identifier: id,
                         screenX: 0,
                         screenY: 0,
                         clientX: 0,
                         clientY: 0});
            }
        }
        startTouches = newStart;
        prevTouches  = newPrev;
        totalTouches = newTotal;
        deltaTouches = newDelta;
        startScale = sizeCalc(startTouches);
        prevScale  = sizeCalc(prevTouches);
        lastTouches = evt.touches.length;
    }

    function finishJstap(evt) {
        if (!evt.touches.length) {
            totalTouches = [];
            startTouches = [];
            prevTouches = [];
            deltaTouches = [];

            deltaScale = 1.0;
            totalScale = 1.0;
            startScale = 0;
            prevScale = 0;
            lastTouches = 0;
            targetElement = null;
            jstapTouches.touch(0);
        }
    }

    function removeTouch(evt) {
        var i, j, id;

        var newStart = [],
            newTotal = [],
            newPrev = [],
            newDelta = [];

        // remove extra touches from startTouches
        for (i = 0; i < evt.touches.length; i++) {
            id = evt.touches[i].identifier;
            for (j = 0; j < startTouches.length; j++) {
                if (startTouches[j].identifier === id) { // found exisiting touch
                    newStart.push(startTouches[j]);
                    newTotal.push(totalTouches[j]);
                    newPrev.push(prevTouches[j]);
                    newDelta.push(deltaTouches[j]);
                    break;
                }
            }
        }

        startTouches = newStart;
        prevTouches  = newPrev;
        totalTouches = newTotal;
        deltaTouches = newDelta;

        if (evt.touches.length) {
            // recalculate start- and prevScale
            startScale = sizeCalc(startTouches);
            prevScale  = sizeCalc(prevTouches);

            var ts = sizeCalc(evt.touches);
            if (ts > 0) {
                if (startScale > 0) {
                    totalScale = ts / startScale;
                }
                if (prevScale > 0) {
                    deltaScale = ts / prevScale;
                }
            }
        }
        finishJstap(evt);
    }

    function detectPinchMove() {
        if (deltaScale > 1.0) {
            targetElement.dispatchEvent(new w.CustomEvent("pinchwiden", {'bubbles': true,'cancelable': true}));
        }
        else if (deltaScale < 1.0) {
            targetElement.dispatchEvent(new w.CustomEvent("pinchnarrow", {'bubbles': true,'cancelable': true}));
        }
    }

    function detectDuringEvents(evt) {
        detectPinchMove(evt);
    }

    // if there was no double tap within the timeframe (+ opts.doubleTapTime
    // 10 milisec) dispatch a tap on eTapTarget

    function detectTap() {
        if (lastTouches === 1 &&
            Math.abs(totalTouches[0].screenX) <= opts.tapDistance &&
            Math.abs(totalTouches[0].screenY) <= opts.tapDistance) {

            var dt = endTime - startTouches[0].startTime;
            if(dt <= opts.tapTime) {
                if(!opts.avoidDoubleTap && lasttap > 0 && (endTime - lasttap) <= opts.doubleTapTime) {
                    eTapTarget.dispatchEvent(new w.CustomEvent("doubletap", {'bubbles': true,'cancelable': true}));
                    lasttap = 0;
                    eTapTarget = null;
                    if (opts.getAllTaps) {
                        targetElement.dispatchEvent(new w.CustomEvent("tap", {'bubbles': true,'cancelable': true}));
                    }
                }
                else {
                    eTapTarget = targetElement;
                    lasttap    = endTime;
                    targetElement.dispatchEvent(new w.CustomEvent("tap", {'bubbles': true,'cancelable': true}));
                }
            }
            else if (dt >= opts.tapLongTime) {
                targetElement.dispatchEvent(new w.CustomEvent("taplong", {'bubbles': true,'cancelable': true}));
            }
        }
    }

    function detectTwinTap(ev) {
        if (lastTouches === 2 &&
            (ev.touches.length || ev.changedTouches.length === 2) &&
            Math.abs(totalTouches[0].screenX) <= opts.tapDistance &&
            Math.abs(totalTouches[0].screenY) <= opts.tapDistance &&
            Math.abs(totalTouches[1].screenX) <= opts.tapDistance &&
            Math.abs(totalTouches[1].screenY) <= opts.tapDistance) {
            var dt = endTime - startTouches[0].startTime;
            if(dt <= opts.tapTime) {
                if(!opts.avoidDoubleTap && lasttap > 0 && (endTime - lasttwintap) <= opts.doubleTapTime) {
                    eTapTarget.dispatchEvent(new w.CustomEvent("doubletwintap", {'bubbles': true,'cancelable': true}));
                    lasttwintap = 0;
                    eTapTarget = null;
                    if (opts.getAllTaps) {
                        targetElement.dispatchEvent(new w.CustomEvent("twintap", {'bubbles': true,'cancelable': true}));
                    }
                }
                else {
                    eTapTarget = targetElement;
                    lasttwintap = endTime;
                    targetElement.dispatchEvent(new w.CustomEvent("twintap", {'bubbles': true,'cancelable': true}));
                }
            }
            else if (dt >= opts.tapLongTime) {
                targetElement.dispatchEvent(new w.CustomEvent("twintaplong", {'bubbles': true,'cancelable': true}));
            }
        }
    }

    function detectSwipeOrFlick() {
        if (lastTouches === 1) {
            var dt = endTime - startTouches[0].startTime;
            // true = horizontal, false: vertical
            var dir = (Math.abs(totalTouches[0].screenX) > Math.abs(totalTouches[0].screenY));

            if (dt > opts.flickTime &&
                !opts.avoidSwipe &&
                (Math.abs(totalTouches[0].screenX) >= opts.swipeDistance ||
                 Math.abs(totalTouches[0].screenY) >= opts.swipeDistance)) {

                targetElement.dispatchEvent(new w.CustomEvent("swipe", {'bubbles': true,'cancelable': true, 'detail': {'direction': dir}}));
            }
            else if (dt < opts.flickTime &&
                     !opts.avoidFlick &&
                     (Math.abs(totalTouches[0].screenX) >= opts.flickDistance ||
                      Math.abs(totalTouches[0].screenY) >= opts.flickDistance)) {
                targetElement.dispatchEvent(new w.CustomEvent("flick", {'bubbles': true,'cancelable': true, 'detail':{'direction': dir}}));
            }
        }
    }

    function detectPinchOrStretch() {
        var bNoTap = ! totalTouches.some(function (e) {
           return (Math.abs(e.screenX) <= opts.tapDistance && Math.abs(e.screenY) <= opts.tapDistance);
        });

        if (totalScale > 1.2 && bNoTap) {
            targetElement.dispatchEvent(new w.CustomEvent("stretch", {'bubbles': true,'cancelable': true}));
        }
        if (totalScale < 0.8 && bNoTap) {
            if (lastTouches === 2) {
                targetElement.dispatchEvent(new w.CustomEvent("pinch", {'bubbles': true,'cancelable': true}));
            }
            else if (lastTouches > 2) {
                targetElement.dispatchEvent(new w.CustomEvent("grab", {'bubbles': true,'cancelable': true}));
            }
        }
    }

    function detectEndEvents(evt) {
        detectTap(evt);
        detectSwipeOrFlick(evt);
        detectPinchOrStretch(evt);
        detectTwinTap(evt);
    }

    function findProxy(evtName, callback) {
        var proxyCb;
        callbackMap.some(function (cbElement) {
            if (cbElement.name === evtName && cbElement.callback === callback) {
                proxyCb = cbElement.proxy;
                return true;
            }
            return false;
        });
        return proxyCb;
    }

    function bindProxy(evtName, callback) {
        var proxy = findProxy(evtName, callback);
        if (!proxy) {
            switch(evtName) {
            case 'start':
                    proxy = function (ev) {
                        if (!anDroid && !ev.scale && ev.scale !== 0) {
                            anDroid = true;
                        }
                        addTouch(ev);
                        if (callback) {
                            callback(ev, jstapTouches);
                        }
                    };
                    break;
            case 'move':
                    proxy = function (ev) {
                        if (anDroid) {
                            ev.preventDefault();
                        }

                        updateTouches(ev.touches,ev);
                        if (callback) {
                            callback(ev, jstapTouches);
                        }
                    };
                    break;
                case 'end':
                    proxy = function (ev) {
                        endTime = new Date().getTime();
                        if (callback) {
                            callback(ev, jstapTouches);
                        }
                        removeTouch(ev);
                    };
                    break;
            default:
                    break;
            }
            var proxyMap = {
                'name': evtName,
                'callback': callback,
                'proxy': proxy
            };
            callbackMap.push(proxyMap);
        }
        return proxy;
    }


    function startListening(element, evtName, callback) {
        if (evtName === 'during') {
            evtName = 'move';
        }
        var rEvtName = evtName;
        var proxy = callback;

        switch (evtName) {
            case 'move':
            case 'start':
            case 'end':
                rEvtName = 'touch' + evtName;
                proxy = bindProxy(evtName, callback);
                break;
            default:
                proxy = callback;
                break;
        }

        element.addEventListener(rEvtName, proxy, false);

        if (evtName === 'end') {
            element.addEventListener('touchcancel', proxy, false);
        }
    }

    function stopListening(element, evtName, callback) {
        if (evtName === 'during') {
            evtName = 'move';
        }
        var rEvtName = evtName;
        var proxy = callback;

        switch (evtName) {
        case 'move':
        case 'start':
        case 'end':
                rEvtName = 'touch'+evtName;
                proxy = findProxy(evtName, callback);
                break;
        default:
                break;
        }

        element.removeEventListener(rEvtName, proxy, false);
        if (evtName === 'end') {
            element.removeEventListener('touchcancel', proxy, false);
        }
    }

    function mTouchStart(ev){
        if (!anDroid && !ev.scale && ev.scale !== 0) {
            anDroid = true;
        }

        addTouch(ev);
    }

    function mTouchMove(ev){
        if (anDroid) {
            ev.preventDefault();
        }

        updateTouches(ev.touches, ev);
        detectDuringEvents(ev);
    }

    function mTouchEnd(ev){
        endTime = new Date().getTime();
        detectEndEvents(ev);
        removeTouch(ev);
    }

    function mTouchCancel(ev) {
        mTouchEnd(ev);
    }

    function startMonitoring() {
        if (!monitoring) {
            document.addEventListener("touchstart", mTouchStart, false);
            document.addEventListener("touchmove", mTouchMove, false);
            document.addEventListener("touchend", mTouchEnd, false);
            document.addEventListener("touchcancel", mTouchCancel, false);
        }
        monitoring++;
    }
    function stopMonitoring() {
        monitoring--;
        if(!monitoring) {
            document.removeEventListener("touchstart", mTouchStart, false);
            document.removeEventListener("touchmove", mTouchMove, false);
            document.removeEventListener("touchend", mTouchEnd, false);
            document.removeEventListener("touchcancel", mTouchCancel, false);
        }
    }

    function JstapBinder() {
        var self = this;
        self.target = null;
    }

    JstapBinder.prototype.bind = function (e, cb) {
        startListening(this.target, e, cb);
        startMonitoring();
    };

    JstapBinder.prototype.unbind = function (e, cb) {
        stopListening(this.target, e, cb);
        stopMonitoring();
    };

    JstapBinder.prototype.tap            = function (cb) {this.bind('tap', cb);};
    JstapBinder.prototype.taplong        = function (cb) {this.bind('taplong', cb);};
    JstapBinder.prototype.twintap        = function (cb) {this.bind('twintap', cb);};
    JstapBinder.prototype.doubletap      = function (cb) {this.bind('doubletap', cb);};
    JstapBinder.prototype.doubletwintap  = function (cb) {this.bind('doubletwintap', cb);};
    JstapBinder.prototype.twintaplong    = function (cb) {this.bind('twintaplong', cb);};
    JstapBinder.prototype.pinchnarrow    = function (cb) {this.bind('pinchnarrow', cb);};
    JstapBinder.prototype.pinchwiden     = function (cb) {this.bind('pinchwiden', cb);};
    JstapBinder.prototype.pinch          = function (cb) {this.bind('pinch', cb);};
    JstapBinder.prototype.stretch        = function (cb) {this.bind('stretch', cb);};
    JstapBinder.prototype.grab           = function (cb) {this.bind('grab', cb);};
    JstapBinder.prototype.swipe          = function (cb) {this.bind('swipe', cb);};
    JstapBinder.prototype.flick          = function (cb) {this.bind('flick', cb);};
    JstapBinder.prototype.start          = function (cb) {this.bind('start', cb);};
    JstapBinder.prototype.end            = function (cb) {this.bind('end', cb);};
    JstapBinder.prototype.move           = function (cb) {this.bind('move', cb);};
    JstapBinder.prototype.during         = function (cb) {this.bind('during', cb);};


    // Accessor Helpers
    function getTotalX() {
        return totalTouches[jstapTouches.id] ?
            totalTouches[jstapTouches.id].screenX :
            -1;
    }

    function getTotalY() {
        return totalTouches[jstapTouches.id] ?
            totalTouches[jstapTouches.id].screenY :
            -1;
    }

    function getStartX() {
        return startTouches[jstapTouches.id] ?
            startTouches[jstapTouches.id].screenX :
            -1;
    }

    function getStartY() {
        return startTouches[jstapTouches.id] ?
            startTouches[jstapTouches.id].screenY :
            -1;
    }

    function getDeltaX() {
        return deltaTouches[jstapTouches.id] ?
            deltaTouches[jstapTouches.id].screenX :
            -1;
    }

    function getDeltaY() {
        return deltaTouches[jstapTouches.id] ?
            deltaTouches[jstapTouches.id].screenY :
            -1;
    }

    function getPrevX() {
        return prevTouches[jstapTouches.id] ?
            prevTouches[jstapTouches.id].screenX :
            -1;
    }

    function getPrevY() {
        return prevTouches[jstapTouches.id] ?
            prevTouches[jstapTouches.id].screenY :
            -1;
    }

    function getTotalScale() {
        return totalScale;
    }

    function getDeltaScale() {
        return deltaScale;
    }

    function getStartTime() {
        return startTouches[jstapTouches.id] ?
            startTouches[jstapTouches.id].startTime :
            0;
    }

    function getEndTime() {
        return endTime;
    }

    function JstapTouch(type) {
        this.type = type || 'start';
        this.scale      = getTotalScale;
        this.startTime  = getStartTime;
        this.endTime    = getEndTime;
        switch (this.type) {
        case 'total':
                this.x = getTotalX;
                this.y = getTotalY;
                break;
        case 'delta':
                this.x = getDeltaX;
                this.y = getDeltaY;
                this.scale = getDeltaScale;
                break;
        case 'previous':
                this.x = getPrevX;
                this.y = getPrevY;
                break;
        default:
                this.x = getStartX;
                this.y = getStartY;
                break;
        }
    }

    function JstapTouches() {
        this.id = 0;
        this.total = new JstapTouch('total');
        this.delta = new JstapTouch('delta');
        this.previous = new JstapTouch('previous');
        this.start = new JstapTouch('start');
    }

    JstapTouches.prototype.numTouches = function () {
        return lastTouches;
    };

    JstapTouches.prototype.touch = function (id) {
        this.id = id || 0;
        return this;
    };

    // accessor function for configuration options
    function setOptions(newOpts) {
        var i,k, pn = Object.getOwnPropertyNames(opts);
        for (i = 0; i < pn.length; i++) {
            k = pn[i];
            if (newOpts.hasOwnProperty(k)) {
                switch(k) {
                    case 'avoidFlick':
                    case 'avoidSwipe':
                    case 'avoidDoubleTap':
                        opts[k] = newOpts[k] ? true : false; // enforce boolean values
                        break;
                    default:
                        if (newOpts[k] > 0) {
                            opts[k] = newOpts[k]; // forbid undefined, null and <=0
                        }
                        break;
                }
            }
        }
    }

    var jstapBind = new JstapBinder(),
        JstapOptionHandler = {
            'options': setOptions
        };

    function launchJstap(jTargetElement) {
        if (jTargetElement) {
            jstapBind.target = jTargetElement;
            return jstapBind;
        }

        // provide accessor functions for options
        return JstapOptionHandler;
    }

    if (!w.jstap) {
        jstapTouches = new JstapTouches();
        // create a global touches object
        w.jstap   = launchJstap;
    }
    if (!w.jester) {
        w.jester = launchJstap; // backward compatibility
    }
}(window));
